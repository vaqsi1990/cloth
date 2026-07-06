"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from '@/component/AppImage'
import Link from 'next/link'
import { Filter, X, ChevronDown, Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'
import DatePicker from "react-datepicker"
import StarRating from "@/components/StarRating"
import { PRODUCT_COLORS, type ProductColorFacet } from '@/lib/product-colors'
import {
  PREDEFINED_LETTER_SIZES,
  formatFilterCount,
  isChildrenAgeSize,
  isChildrenShopContext,
  isFootwearShopContext,
  resolveFootwearGenderFromShopContext,
  resolveShopDisplaySizes,
  SHOP_GENDER_FILTER_OPTIONS,
  type ShopGenderFilterValue,
} from '@/lib/shop-product-filters'
import { appendShopListFilterParams, type ShopSortBy } from '@/lib/shop-list-params'
import { PRODUCT_IMAGE_QUALITY } from '@/lib/image-config'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  collectShopFilterCategoriesForGender,
  dedupeProductCategories,
  findCategoryByParam,
  isSizeOptionalShopContext,
  resolveCategorySlugParam,
  sortProductCategories,
  type ProductCategory,
} from '@/lib/product-categories'
import { isProductVipActive } from '@/lib/product-vip'
import ProductListPrice from '@/components/ProductListPrice'
import ProductListDiscountBadge from '@/components/ProductListDiscountBadge'
import ProductMasonryGrid from '@/components/ProductMasonryGrid'
import {
    buildShopBrowserUrl,
    clearPersistedShopBrowserState,
    HOME_PAGE_STATE_KEY,
    loadPersistedShopState,
    mergeShopStateWithUrl,
    SHOP_FILTERS_RESET_EVENT,
    SHOP_PAGE_STATE_KEY,
    SHOP_RETURN_URL_KEY,
    type PersistedShopPageState,
} from '@/lib/shop-browser-state'
import {
    fetchShopData,
    getShopFilterKey,
    SHOP_FETCH_DEBOUNCE_MS,
} from '@/lib/shop-data-client'
import type { BatchRentalStatusMap } from '@/lib/product-rental-status-batch'
import { hasRentalPeriodConflict } from '@/lib/rental-dates'
import {
  isProductHiddenFromShop,
  PRODUCT_STATUS_UPDATED_EVENT,
  type ProductStatusUpdateDetail,
} from '@/lib/product-status-sync'
import { HOMEPAGE_FEATURED_UPDATED_EVENT } from '@/lib/homepage-featured-sync'
import PriceRangeFilter from '@/component/PriceRangeFilter'
import SizePillSelector from '@/components/SizePillSelector'

type PurchaseType = 'all' | 'rent-only' | 'sale-only' | 'rent-and-sale'

const MOBILE_HOME_MAX_WIDTH_QUERY = '(max-width: 1023px)'

type ShopPageClientProps = {
    homepageMode?: boolean
}

const ShopPageClient = ({ homepageMode = false }: ShopPageClientProps) => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const genderParam = searchParams.get('gender')
    const searchParam = searchParams.get('search')
    const categoryParam = searchParams.get('category')
    const categoriesParam = searchParams.get('categories')
    const discountParam = searchParams.get('discount')
    const vipParam = searchParams.get('vip')

    const [products, setProducts] = useState<Product[]>([])
    const [shopCategories, setShopCategories] = useState<ProductCategory[]>(
        DEFAULT_PRODUCT_CATEGORIES,
    )
    const filterCategories = React.useMemo(
        () =>
            collectShopFilterCategoriesForGender(
                genderParam as ShopGenderFilterValue | null,
                shopCategories,
            ),
        [genderParam, shopCategories],
    )
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(MOBILE_HOME_MAX_WIDTH_QUERY).matches
            : false,
    )
    const useHomeInfiniteScroll = React.useMemo(
        () => homepageMode && isMobileViewport,
        [homepageMode, isMobileViewport],
    )
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 0])
    const [maxPrice, setMaxPrice] = useState(0)
    const [selectedSizeSystems, setSelectedSizeSystems] = useState<string[]>([])
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [colorSearch, setColorSearch] = useState('')
    const [colorFacets, setColorFacets] = useState<ProductColorFacet[]>(() =>
        PRODUCT_COLORS.map((color) => ({ ...color, count: 0 })),
    )
    const [availableSizes, setAvailableSizes] = useState<string[]>(PREDEFINED_LETTER_SIZES)
    const isChildrenShop = React.useMemo(
        () =>
            isChildrenShopContext({
                genderParam,
                categoryParam,
                selectedCategories,
                categories: shopCategories,
            }),
        [genderParam, categoryParam, selectedCategories, shopCategories],
    )
    const isFootwearShop = React.useMemo(
        () =>
            isFootwearShopContext({
                genderParam,
                categoryParam,
                selectedCategories,
                categories: shopCategories,
            }),
        [genderParam, categoryParam, selectedCategories, shopCategories],
    )
    const footwearGender = React.useMemo(
        () =>
            resolveFootwearGenderFromShopContext({
                genderParam,
                categoryParam,
                selectedCategories,
                categories: shopCategories,
            }),
        [genderParam, categoryParam, selectedCategories, shopCategories],
    )
    const shopSizeDisplayContext = React.useMemo(
        () => ({
            isChildren: isChildrenShop && !isFootwearShop,
            isFootwear: isFootwearShop,
            footwearGender,
        }),
        [isChildrenShop, isFootwearShop, footwearGender],
    )
    const isSizeOptionalShop = React.useMemo(
        () =>
            isSizeOptionalShopContext({
                categoryParam,
                selectedCategories,
                categories: shopCategories,
            }),
        [categoryParam, selectedCategories, shopCategories],
    )
    const [categoryCountsBySlug, setCategoryCountsBySlug] = useState<Record<string, number>>({})
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])

    const [rentalStartDate, setRentalStartDate] = useState<Date | null>(null)
    const [rentalEndDate, setRentalEndDate] = useState<Date | null>(null)
    const [purchaseType, setPurchaseType] = useState<PurchaseType>("all")
    const [onlyDiscounted, setOnlyDiscounted] = useState(false)
    const [onlyVip, setOnlyVip] = useState(false)
    const [productRentalStatus, setProductRentalStatus] = useState<BatchRentalStatusMap>({})
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(16)
    const [serverTotalPages, setServerTotalPages] = useState(1)
    const [serverTotalCount, setServerTotalCount] = useState(0)
    // For offset pagination we intentionally skip `count()` on the server (performance).
    // In that case we only know whether there is more (`hasMore`), not exact total pages.
    const [serverHasMore, setServerHasMore] = useState(false)
    const [isTotalPagesKnown, setIsTotalPagesKnown] = useState(false)
    const [vipProductsCount, setVipProductsCount] = useState(0)
    const [discountedProductsCount, setDiscountedProductsCount] = useState(0)
    const [activeMobileFilter, setActiveMobileFilter] = useState<string | null>(null)
    const [isMobileFilterOverlayOpen, setIsMobileFilterOverlayOpen] = useState(false)
    const [isCategorySectionOpen, setIsCategorySectionOpen] = useState(false)

    // Persist state across navigation
    const scrollYRef = useRef(0)
    const shopFetchIdRef = useRef(0)
    const shopInitializedRef = useRef(false)
    const prevCategoryUrlRef = useRef<string | null>(null)
    const filtersSnapshotRef = useRef<string | null>(null)
    const allowFilterPageResetRef = useRef(false)
    const isRestoreSettlingRef = useRef(true)
    const prevSizeContextRef = useRef<string | null>(null)
    const hasCompletedInitialRestoreRef = useRef(false)
    const prevPriceCeilingKeyRef = useRef<string | null>(null)
    const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
    const pendingHomeRestorePagesRef = useRef<number | null>(null)
    const prevHomeInfiniteScrollRef = useRef<boolean | null>(null)
    const [savedScrollY, setSavedScrollY] = useState<number | null>(null)
    const [scrollRestored, setScrollRestored] = useState(false)
    const [hasRestoredState, setHasRestoredState] = useState(false)
    const [homepageRefreshNonce, setHomepageRefreshNonce] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            scrollYRef.current = window.scrollY
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const mq = window.matchMedia(MOBILE_HOME_MAX_WIDTH_QUERY)
        const onChange = () => setIsMobileViewport(mq.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    useEffect(() => {
        if (!homepageMode || !hasRestoredState) return

        const mode = useHomeInfiniteScroll
        if (prevHomeInfiniteScrollRef.current === null) {
            prevHomeInfiniteScrollRef.current = mode
            return
        }

        if (prevHomeInfiniteScrollRef.current !== mode) {
            prevHomeInfiniteScrollRef.current = mode
            pendingHomeRestorePagesRef.current = null
            setCurrentPage(1)
            setLoadingMore(false)
        }
    }, [homepageMode, hasRestoredState, useHomeInfiniteScroll])

    useEffect(() => {
        const handler = (event: Event) => {
            const { productId, status } = (event as CustomEvent<ProductStatusUpdateDetail>).detail
            setProducts((prev) => {
                if (isProductHiddenFromShop(status)) {
                    return prev.filter((p) => p.id !== productId)
                }
                return prev.map((p) =>
                    p.id === productId ? { ...p, status } : p,
                )
            })
        }
        window.addEventListener(PRODUCT_STATUS_UPDATED_EVENT, handler)
        return () => window.removeEventListener(PRODUCT_STATUS_UPDATED_EVENT, handler)
    }, [])

    useEffect(() => {
        if (!homepageMode) return
        const handler = () => setHomepageRefreshNonce((value) => value + 1)
        window.addEventListener(HOMEPAGE_FEATURED_UPDATED_EVENT, handler)
        return () =>
            window.removeEventListener(HOMEPAGE_FEATURED_UPDATED_EVENT, handler)
    }, [homepageMode])

    const saveState = useCallback(() => {
        if (typeof window === 'undefined') return
        const state = {
            selectedCategories,
            priceRange,
            selectedSizeSystems,
            selectedSizes,
            selectedColors,
            colorSearch,
            selectedLocations,
            rentalStartDate: rentalStartDate ? rentalStartDate.toISOString() : null,
            rentalEndDate: rentalEndDate ? rentalEndDate.toISOString() : null,
            sortBy,
            purchaseType,
            onlyDiscounted,
            onlyVip,
            currentPage,
            scrollY: scrollYRef.current,
        }
        sessionStorage.setItem(
            homepageMode ? HOME_PAGE_STATE_KEY : SHOP_PAGE_STATE_KEY,
            JSON.stringify(state),
        )
    }, [
        selectedCategories,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        colorSearch,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        currentPage,
        homepageMode,
    ])

    const applyPersistedShopState = useCallback((state: PersistedShopPageState) => {
        setSelectedCategories(state.selectedCategories)
        setPriceRange(state.priceRange)
        setSelectedSizeSystems(state.selectedSizeSystems)
        setSelectedSizes(state.selectedSizes)
        setSelectedColors(state.selectedColors)
        setColorSearch(state.colorSearch ?? '')
        setSelectedLocations(state.selectedLocations)
        setRentalStartDate(state.rentalStartDate ? new Date(state.rentalStartDate) : null)
        setRentalEndDate(state.rentalEndDate ? new Date(state.rentalEndDate) : null)
        setSortBy(state.sortBy)
        setPurchaseType(state.purchaseType)
        setOnlyDiscounted(state.onlyDiscounted)
        setOnlyVip(state.onlyVip)
        setCurrentPage(state.currentPage)
        setSavedScrollY(state.scrollY)
    }, [])

    // Restore saved state once on mount; URL params override session values
    useEffect(() => {
        if (typeof window === 'undefined') return

        const storageKey = homepageMode ? HOME_PAGE_STATE_KEY : SHOP_PAGE_STATE_KEY
        const persisted =
            loadPersistedShopState(storageKey) ??
            ({
                selectedCategories: [],
                priceRange: [0, 0],
                selectedSizeSystems: [],
                selectedSizes: [],
                selectedColors: [],
                colorSearch: '',
                selectedLocations: [],
                rentalStartDate: null,
                rentalEndDate: null,
                sortBy: 'newest',
                purchaseType: 'all',
                onlyDiscounted: false,
                onlyVip: false,
                currentPage: 1,
                scrollY: 0,
            } satisfies PersistedShopPageState)

        const currentSearchParams = new URLSearchParams(window.location.search)
        const categoriesFromUrl = currentSearchParams.get('categories')
        const categoryNames = categoriesFromUrl
            ? categoriesFromUrl
                  .split(',')
                  .map(
                      (slug) =>
                          findCategoryByParam(slug, DEFAULT_PRODUCT_CATEGORIES)?.name ??
                          slug,
                  )
            : categoryParam
              ? [
                    findCategoryByParam(categoryParam, DEFAULT_PRODUCT_CATEGORIES)?.name ??
                        categoryParam,
                ]
              : persisted.selectedCategories

        const merged = mergeShopStateWithUrl(
            {
                ...persisted,
                selectedCategories: categoryNames.filter(Boolean),
            },
            currentSearchParams,
            {
                discountParam,
                vipParam,
                categoryNames:
                    categoryNames.length > 0 ? categoryNames.filter(Boolean) : null,
            },
        )

        if (
            homepageMode &&
            merged.currentPage > 1 &&
            window.matchMedia(MOBILE_HOME_MAX_WIDTH_QUERY).matches
        ) {
            pendingHomeRestorePagesRef.current = merged.currentPage
            applyPersistedShopState({ ...merged, currentPage: 1 })
        } else {
            applyPersistedShopState(merged)
        }

        shopInitializedRef.current = true
        prevCategoryUrlRef.current = categoriesParam
            ? `categories:${categoriesParam}`
            : categoryParam
              ? `category:${categoryParam}`
              : ''
        isRestoreSettlingRef.current = true
        setScrollRestored(false)
        setHasRestoredState(true)
    }, [])

    useEffect(() => {
        if (!shopInitializedRef.current) return

        const urlCategoryKey = categoriesParam
            ? `categories:${categoriesParam}`
            : categoryParam
              ? `category:${categoryParam}`
              : ''

        if (prevCategoryUrlRef.current === urlCategoryKey) return
        prevCategoryUrlRef.current = urlCategoryKey

        if (categoriesParam) {
            const names = categoriesParam
                .split(',')
                .map(
                    (slug) =>
                        findCategoryByParam(slug.trim(), filterCategories)?.name ??
                        slug.trim(),
                )
                .filter(Boolean)
            setSelectedCategories(names)
            return
        }

        if (categoryParam) {
            const resolved =
                findCategoryByParam(categoryParam, filterCategories)?.name ?? categoryParam
            setSelectedCategories([resolved])
            return
        }

        setSelectedCategories([])
    }, [categoryParam, categoriesParam, filterCategories])

    useEffect(() => {
        if (!hasRestoredState) return

        const sizeContextKey = `${isChildrenShop}|${isFootwearShop}|${isSizeOptionalShop}|${footwearGender}`
        if (prevSizeContextRef.current === null) {
            prevSizeContextRef.current = sizeContextKey
            return
        }
        if (prevSizeContextRef.current === sizeContextKey) return
        prevSizeContextRef.current = sizeContextKey

        const sizeContext = {
            isChildren: isChildrenShop && !isFootwearShop,
            isFootwear: isFootwearShop,
            footwearGender,
        }

        if (isFootwearShop) {
            setSelectedSizeSystems([])
            setAvailableSizes(resolveShopDisplaySizes([], sizeContext))
            return
        }

        if (isSizeOptionalShop) {
            setSelectedSizeSystems([])
            setSelectedSizes([])
            return
        }

        if (isChildrenShop) {
            setSelectedSizeSystems([])
            setSelectedSizes((prev) => prev.filter((size) => isChildrenAgeSize(size)))
            setAvailableSizes(resolveShopDisplaySizes([], sizeContext))
            return
        }

        setSelectedSizes((prev) => prev.filter((size) => !isChildrenAgeSize(size)))
    }, [hasRestoredState, isChildrenShop, isFootwearShop, isSizeOptionalShop, footwearGender])

    // Save when key filters/page change (skip until restore completes)
    useEffect(() => {
        if (!hasRestoredState) return
        saveState()
    }, [
        selectedCategories,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        colorSearch,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        currentPage,
        saveState
    ])

    // Save on unload/navigation away
    useEffect(() => {
        const handleBeforeUnload = () => saveState()
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            handleBeforeUnload()
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [saveState])

    // Restore scroll after data load
    useEffect(() => {
        if (
            !loading &&
            !loadingMore &&
            hasRestoredState &&
            !scrollRestored &&
            savedScrollY !== null
        ) {
            if (useHomeInfiniteScroll && pendingHomeRestorePagesRef.current !== null) return
            window.scrollTo(0, savedScrollY)
            setScrollRestored(true)
        }
    }, [loading, loadingMore, hasRestoredState, scrollRestored, savedScrollY, useHomeInfiniteScroll])

    const clearSearch = () => {
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        params.delete('search')
        const query = params.toString()
        router.push(query ? `/shop?${query}` : '/shop')
    }

    const setGenderFilter = (gender: ShopGenderFilterValue | null) => {
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        if (gender) {
            params.set('gender', gender)
        } else {
            params.delete('gender')
        }
        const query = params.toString()
        const base = homepageMode ? '/' : '/shop'
        router.push(query ? `${base}?${query}` : base)
    }

    const getProductPurchaseLabel = (product: Product): string | null => {
        const canRent = Boolean(
            product.isRentable && product.rentalPriceTiers && product.rentalPriceTiers.length > 0,
        )
        const canBuy = Boolean(product.variants?.some((variant) => (variant.price ?? 0) > 0))

        if (canBuy) return 'იყიდება'
        if (canRent) return 'ქირავდება'
        return null
    }

    const resolveCategorySlugsFromNames = useCallback(
        (names: string[]): string[] => {
            return names
                .map((name) => {
                    const cat =
                        filterCategories.find((c) => c.name === name) ||
                        findCategoryByParam(name, filterCategories)
                    return cat?.slug ?? resolveCategorySlugParam(name)
                })
                .filter((slug): slug is string => Boolean(slug))
        },
        [filterCategories],
    )

    const activeCategorySlugs = useCallback((): string[] => {
        return resolveCategorySlugsFromNames(selectedCategories)
    }, [selectedCategories, resolveCategorySlugsFromNames])

    const shopListFilters = useCallback(
        () => ({
            selectedColors,
            colorSearch: colorSearch.trim() || undefined,
            selectedCategorySlugs: activeCategorySlugs(),
            selectedSizes,
            selectedSizeSystems,
            selectedLocations,
            priceRange: priceRange as [number, number],
            maxPrice,
            purchaseType,
            sortBy: sortBy as ShopSortBy,
        }),
        [
            selectedColors,
            colorSearch,
            selectedSizes,
            selectedSizeSystems,
            selectedLocations,
            priceRange,
            maxPrice,
            purchaseType,
            sortBy,
            activeCategorySlugs,
        ],
    )

    const buildCurrentShopUrl = useCallback(
        (pageOverride?: number) => {
            const base = homepageMode ? '/' : '/shop'
            return buildShopBrowserUrl({
                basePath: base,
                currentSearchParams: new URLSearchParams(searchParams.toString()),
                currentPage: useHomeInfiniteScroll ? 1 : (pageOverride ?? currentPage),
                onlyDiscounted,
                onlyVip,
                filters: shopListFilters(),
            })
        },
        [
            homepageMode,
            useHomeInfiniteScroll,
            searchParams,
            currentPage,
            onlyDiscounted,
            onlyVip,
            shopListFilters,
        ],
    )

    const syncShopUrl = useCallback(
        (pageOverride?: number) => {
            if (typeof window === 'undefined') return
            const nextUrl = buildCurrentShopUrl(pageOverride)
            const currentUrl = `${window.location.pathname}${window.location.search}`
            if (currentUrl !== nextUrl) {
                router.replace(nextUrl, { scroll: false })
            }
        },
        [buildCurrentShopUrl, router],
    )

    // Keep pagination in sync when navigating with browser back/forward
    useEffect(() => {
        if (!hasRestoredState || useHomeInfiniteScroll) return
        const raw = searchParams.get('page')
        if (!raw) return
        const urlPage = Math.max(1, parseInt(raw, 10) || 1)
        setCurrentPage((prev) => (prev === urlPage ? prev : urlPage))
    }, [searchParams, hasRestoredState, useHomeInfiniteScroll])

    // Persist filters/page in the URL so product back returns to the same list
    useEffect(() => {
        if (!hasRestoredState || isRestoreSettlingRef.current) return
        const timer = window.setTimeout(() => {
            syncShopUrl()
        }, 200)
        return () => window.clearTimeout(timer)
    }, [
        hasRestoredState,
        syncShopUrl,
        selectedCategories,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        colorSearch,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        currentPage,
    ])

    useEffect(() => {
        if (
            !hasRestoredState ||
            loading ||
            hasCompletedInitialRestoreRef.current
        ) {
            return
        }

        syncShopUrl()
        const frameId = window.requestAnimationFrame(() => {
            isRestoreSettlingRef.current = false
            allowFilterPageResetRef.current = true
            hasCompletedInitialRestoreRef.current = true
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [hasRestoredState, loading, syncShopUrl])

    const shopQueryKey = React.useMemo(() => {
        const params = new URLSearchParams()
        params.set('page', String(currentPage))
        params.set('limit', String(itemsPerPage))
        if (genderParam) {
            params.append('gender', genderParam)
        }
        if (searchParam) {
            params.append('search', searchParam)
        }
        if (onlyDiscounted) {
            params.append('hasDiscount', 'true')
        }
        if (onlyVip) {
            params.append('isVip', 'true')
        }
        if (homepageMode) {
            params.append('featuredFirst', 'true')
            if (homepageRefreshNonce > 0) {
                params.set('fresh', '1')
            }
        }
        appendShopListFilterParams(params, shopListFilters())
        return params.toString()
    }, [
        currentPage,
        itemsPerPage,
        genderParam,
        searchParam,
        categoryParam,
        selectedCategories,
        onlyDiscounted,
        onlyVip,
        homepageMode,
        homepageRefreshNonce,
        shopListFilters,
    ])

    const shopFilterKey = React.useMemo(
        () => getShopFilterKey(shopQueryKey),
        [shopQueryKey],
    )

    const shopFetchReadyRef = useRef(false)
    const prevShopFilterKeyRef = useRef(shopFilterKey)
    const [activeShopQueryKey, setActiveShopQueryKey] = useState<string | null>(null)

    // Debounce filter changes; pagination and first load fetch immediately
    useEffect(() => {
        if (!hasRestoredState) return

        if (!shopFetchReadyRef.current) {
            shopFetchReadyRef.current = true
            prevShopFilterKeyRef.current = shopFilterKey
            setActiveShopQueryKey(shopQueryKey)
            return
        }

        const filterChanged = prevShopFilterKeyRef.current !== shopFilterKey
        prevShopFilterKeyRef.current = shopFilterKey

        if (!filterChanged) {
            setActiveShopQueryKey(shopQueryKey)
            return
        }

        const timer = window.setTimeout(() => {
            setActiveShopQueryKey(shopQueryKey)
        }, SHOP_FETCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timer)
    }, [hasRestoredState, shopQueryKey, shopFilterKey])

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch('/api/categories')
                const data = await response.json()
                if (data.success && data.categories?.length > 0) {
                    setShopCategories(
                        sortProductCategories(dedupeProductCategories(data.categories)),
                    )
                }
            } catch {
                // keep defaults
            }
        }
        void loadCategories()
    }, [])

    useEffect(() => {
        if (!genderParam) return
        const allowedNames = new Set(filterCategories.map((category) => category.name))
        setSelectedCategories((prev) => {
            const next = prev.filter((name) => allowedNames.has(name))
            return next.length === prev.length ? prev : next
        })
    }, [genderParam, filterCategories])

    const locations = [
        { id: "თბილისი", label: "თბილისი" },
        { id: "ქუთაისი", label: "ქუთაისი" },
        { id: "რუსთავი", label: "რუსთავი" },
        { id: "ბათუმი", label: "ბათუმი" }
    ]

    const goToPage = (page: number) => {
        setCurrentPage(page)
        syncShopUrl(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleProductNavigate = useCallback(() => {
        scrollYRef.current = window.scrollY
        const returnUrl = buildCurrentShopUrl()
        saveState()
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(SHOP_RETURN_URL_KEY, returnUrl)
        }
        syncShopUrl()
    }, [buildCurrentShopUrl, saveState, syncShopUrl])

    // Single orchestrated fetch via /api/shop
    useEffect(() => {
        if (!hasRestoredState || activeShopQueryKey === null) return

        const fetchId = ++shopFetchIdRef.current
        const controller = new AbortController()
        const isStale = () => fetchId !== shopFetchIdRef.current

        const loadShopData = async () => {
            const queryParams = new URLSearchParams(activeShopQueryKey)
            const requestPage = Math.max(
                1,
                parseInt(queryParams.get('page') ?? '1', 10) || 1,
            )
            const isHomeLoadMore = useHomeInfiniteScroll && requestPage > 1

            if (isHomeLoadMore) {
                setLoadingMore(true)
            } else {
                setLoading(true)
            }
            try {
                const data = await fetchShopData(activeShopQueryKey, controller.signal)
                if (isStale()) return

                if (isHomeLoadMore) {
                    setProducts((prev) => {
                        const seen = new Set(prev.map((product) => product.id))
                        const next = [...prev]
                        for (const product of data.products) {
                            if (!seen.has(product.id)) {
                                seen.add(product.id)
                                next.push(product)
                            }
                        }
                        return next
                    })
                } else {
                    setProducts(data.products)
                }
                setServerTotalPages(data.totalPages ?? 1)
                setServerTotalCount(data.totalCount ?? data.products.length)
                setServerHasMore(Boolean(data.hasMore))
                setIsTotalPagesKnown(
                    data.totalPages !== null && data.totalPages !== undefined,
                )

                if (useHomeInfiniteScroll && pendingHomeRestorePagesRef.current !== null) {
                    const targetPage = pendingHomeRestorePagesRef.current
                    if (requestPage < targetPage && data.hasMore) {
                        setCurrentPage(requestPage + 1)
                    } else {
                        pendingHomeRestorePagesRef.current = null
                    }
                }

                setColorFacets(data.facets.colors)
                setCategoryCountsBySlug(data.facets.categoryCounts)
                setAvailableSizes(resolveShopDisplaySizes(data.facets.sizes, shopSizeDisplayContext))
                setVipProductsCount(data.facets.vipCount)
                setDiscountedProductsCount(data.facets.discountCount)

                setProductRentalStatus((prev) =>
                    isHomeLoadMore ? { ...prev, ...(data.rentalStatus ?? {}) } : (data.rentalStatus ?? {}),
                )

                const calculatedMaxPrice = Math.max(1, Math.ceil(data.priceRange?.max ?? 200))
                setMaxPrice(calculatedMaxPrice)

                const ceilingParams = new URLSearchParams(activeShopQueryKey)
                ceilingParams.delete('priceMin')
                ceilingParams.delete('priceMax')
                ceilingParams.delete('page')
                const priceCeilingKey = ceilingParams.toString()
                const priceCeilingChanged =
                    prevPriceCeilingKeyRef.current !== null &&
                    prevPriceCeilingKeyRef.current !== priceCeilingKey
                prevPriceCeilingKeyRef.current = priceCeilingKey

                if (!isHomeLoadMore) {
                    setPriceRange((prev) => {
                        if (priceCeilingChanged) {
                            return [0, calculatedMaxPrice]
                        }
                        if (prev[0] === 0 && prev[1] === 0) {
                            return [0, calculatedMaxPrice]
                        }
                        const nextMin = Math.max(0, Math.min(prev[0], calculatedMaxPrice))
                        const nextMax = Math.max(nextMin, Math.min(prev[1], calculatedMaxPrice))
                        if (nextMin === prev[0] && nextMax === prev[1]) {
                            return prev
                        }
                        return [nextMin, nextMax]
                    })
                }
            } catch (error: unknown) {
                if (
                    isStale() ||
                    controller.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError')
                ) {
                    return
                }
                console.error('Error fetching shop data:', error)
            } finally {
                if (!isStale()) {
                    if (isHomeLoadMore) {
                        setLoadingMore(false)
                    } else {
                        setLoading(false)
                    }
                }
            }
        }

        void loadShopData()
        return () => controller.abort('cleanup')
    }, [hasRestoredState, activeShopQueryKey, useHomeInfiniteScroll, shopSizeDisplayContext])

    // Check if product is available during selected dates
    const isProductAvailable = (product: Product): boolean => {
        if (!rentalStartDate || !rentalEndDate || !product.isRentable) return true

        const variants = productRentalStatus[product.id]
        if (!variants || variants.length === 0) return true

        // Check if any variant has availability for the selected dates
        return variants.some((variant) => {
            const activeRentals = variant.activeRentals || []

            const hasConflict = activeRentals.some((period) =>
                hasRentalPeriodConflict(
                    rentalStartDate,
                    rentalEndDate,
                    period.startDate,
                    period.endDate,
                ),
            )

            return !hasConflict
        })
    }

    // Server-side filtered page; rental dates applied client-side on current page only
    const currentProducts = products.filter((product) => isProductAvailable(product))

    const showPagination =
        !useHomeInfiniteScroll && (currentPage > 1 || serverHasMore)

    // Mobile homepage infinite scroll — load next page when sentinel enters viewport
    useEffect(() => {
        if (!useHomeInfiniteScroll || !hasRestoredState) return
        if (pendingHomeRestorePagesRef.current !== null) return

        const sentinel = loadMoreSentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (
                    entry?.isIntersecting &&
                    serverHasMore &&
                    !loading &&
                    !loadingMore
                ) {
                    setCurrentPage((prev) => prev + 1)
                }
            },
            { rootMargin: '400px 0px' },
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [
        useHomeInfiniteScroll,
        hasRestoredState,
        serverHasMore,
        loading,
        loadingMore,
        currentProducts.length,
    ])

    // Reset to page 1 when filters change (skip initial restore snapshot)
    useEffect(() => {
        if (!hasRestoredState) return

        const snapshot = JSON.stringify({
            selectedCategories,
            priceRange,
            selectedSizeSystems,
            selectedSizes,
            selectedColors,
            colorSearch,
            selectedLocations,
            rentalStartDate: rentalStartDate?.toISOString() ?? null,
            rentalEndDate: rentalEndDate?.toISOString() ?? null,
            sortBy,
            purchaseType,
            onlyDiscounted,
            onlyVip,
            categoryParam,
            categoriesParam,
            genderParam,
            searchParam,
            discountParam,
            vipParam,
        })

        if (!allowFilterPageResetRef.current || isRestoreSettlingRef.current) {
            filtersSnapshotRef.current = snapshot
            return
        }

        if (filtersSnapshotRef.current === null) {
            filtersSnapshotRef.current = snapshot
            return
        }

        if (filtersSnapshotRef.current !== snapshot) {
            filtersSnapshotRef.current = snapshot
            pendingHomeRestorePagesRef.current = null
            setCurrentPage(1)
            syncShopUrl(1)
        }
    }, [
        hasRestoredState,
        selectedCategories,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        colorSearch,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        categoryParam,
        genderParam,
        searchParam,
        discountParam,
        vipParam,
        syncShopUrl,
    ])

    // Handle category selection
    const toggleCategory = (categoryName: string) => {
        setSelectedCategories((prev) => {
            const next = prev.includes(categoryName)
                ? prev.filter((c) => c !== categoryName)
                : [...prev, categoryName]

            const slugs = resolveCategorySlugsFromNames(next)
            prevCategoryUrlRef.current =
                slugs.length > 1
                    ? `categories:${slugs.join(',')}`
                    : slugs.length === 1
                      ? `category:${slugs[0]}`
                      : ''

            return next
        })
    }

    const toggleSize = (size: string) => {
        setSelectedSizes(prev => {
            // Check if size already exists (case-insensitive)
            const existingIndex = prev.findIndex(s => s.toUpperCase() === size.toUpperCase())
            if (existingIndex !== -1) {
                // Remove existing size
                return prev.filter((_, index) => index !== existingIndex)
            } else {
                // Add new size
                return [...prev, size]
            }
        })
    }

    // Handle color selection
    const handleColorSearchChange = (value: string) => {
        setColorSearch(value)
        if (value.trim()) {
            setSelectedColors([])
        }
    }

    const toggleColor = (color: string) => {
        setColorSearch('')
        setSelectedColors((prev) =>
            prev.includes(color)
                ? prev.filter((entry) => entry !== color)
                : [...prev, color],
        )
    }

    // Handle location selection
    const toggleLocation = (location: string) => {
        setSelectedLocations(prev =>
            prev.includes(location)
                ? prev.filter(l => l !== location)
                : [...prev, location]
        )
    }



    // Clear all filters
    const clearFilters = useCallback(() => {
        clearPersistedShopBrowserState()

        setSelectedCategories([])
        setSelectedSizeSystems([])
        setSelectedSizes([])
        setSelectedColors([])
        setColorSearch('')
        setSelectedLocations([])
        setRentalStartDate(null)
        setRentalEndDate(null)
        setPurchaseType('all')
        setOnlyDiscounted(false)
        setOnlyVip(false)
        pendingHomeRestorePagesRef.current = null
        setCurrentPage(1)
        setPriceRange([0, 0])
        setSortBy('newest')

        router.replace('/')
    }, [router])

    useEffect(() => {
        const handler = () => clearFilters()
        window.addEventListener(SHOP_FILTERS_RESET_EVENT, handler)
        return () => window.removeEventListener(SHOP_FILTERS_RESET_EVENT, handler)
    }, [clearFilters])

    // Get main product image
    const getMainImage = (product: Product) => {
        if (product.images && product.images.length > 0) {
            return product.images[0].url
        }
        return '/placeholder.jpg'
    }



    return (
        <div className="min-h-screen ">

         

            <div className="container max-w-7xl mx-auto px-2 py-8">
                {/* Mobile Filter Bar - sticky below header on small screens */}
                <div className="lg:hidden mb-4">
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="flex items-center justify-center px-2 py-2">
                            <button
                                onClick={() => {
                                    setIsMobileFilterOverlayOpen(true)
                                    setActiveMobileFilter(isSizeOptionalShop ? 'gender' : 'size')
                                }}
                                className="flex items-center gap-1 px-3 py-2 text-[16px] font-medium text-black whitespace-nowrap hover:bg-gray-50 rounded"
                            >
                                <Filter className="w-4 h-4" />
                                <span>ფილტრები</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Filter Overlay - Temu Style */}
                {isMobileFilterOverlayOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
                        {/* Header with Close Button */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-black">ფილტრები</h2>
                            <button
                                onClick={() => setIsMobileFilterOverlayOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-black" />
                            </button>
                        </div>
                        <div className="flex flex-1 overflow-hidden pb-20">
                            {/* Left Sidebar - Filter Categories */}
                            <div className="w-32 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                                <div className="p-2">
                                    <button
                                        onClick={() => setActiveMobileFilter('gender')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'gender'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        სქესი
                                    </button>
                                    {!isSizeOptionalShop && (
                                    <button
                                        onClick={() => setActiveMobileFilter('size')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'size'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        {isChildrenShop ? 'ასაკი' : 'ზომა'}
                                    </button>
                                    )}
                                    <button
                                        onClick={() => setActiveMobileFilter('color')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'color'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        ფერი
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('category')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'category'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        კატეგორია
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('price')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'price'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        ფასი
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('location')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'location'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        მდებარეობა
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('type')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'type'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        ტიპი
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('vip')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'vip'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        VIP
                                    </button>
                                    <button
                                        onClick={() => setActiveMobileFilter('discount')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'discount'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        ფასდაკლებები
                                    </button>
                                </div>
                            </div>

                            {/* Right Content Area - Filter Options */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {activeMobileFilter === 'gender' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">სქესი</h3>
                                        {SHOP_GENDER_FILTER_OPTIONS.map(({ value, label }) => {
                                            const active =
                                                value === null
                                                    ? !genderParam
                                                    : genderParam === value
                                            return (
                                                <label
                                                    key={label}
                                                    className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${active
                                                        ? 'bg-[#1B3729] text-white'
                                                        : 'bg-gray-50 text-black hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="mobileGenderFilter"
                                                            checked={active}
                                                            onChange={() => setGenderFilter(value)}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-[16px]">{label}</span>
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}

                                {activeMobileFilter === 'size' && !isSizeOptionalShop && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">
                                            {isChildrenShop ? 'ასაკი' : 'ზომა'}
                                        </h3>
                                        <SizePillSelector
                                            mode="multiple"
                                            options={availableSizes.map((size) => ({
                                                value: size,
                                                label: size,
                                            }))}
                                            values={selectedSizes}
                                            onToggle={toggleSize}
                                            compact={isChildrenShop}
                                        />
                                    </div>
                                )}

                                {activeMobileFilter === 'color' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფერი</h3>
                                        <input
                                            type="text"
                                            value={colorSearch}
                                            onChange={(e) => handleColorSearchChange(e.target.value)}
                                            placeholder="მაგ. შავი, ლურჯი..."
                                            className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                        />
                                        <div className="flex flex-wrap gap-4">
                                            {colorFacets.map((color) => {
                                                return (
                                                    <div key={color.id} className="flex flex-col items-center gap-1">
                                                        <button
                                                            onClick={() => toggleColor(color.id)}
                                                            className={`relative w-12 h-12 rounded-full border-2 transition-all ${selectedColors.includes(color.id)
                                                                ? 'border-[#1B3729] ring-2 ring-[#1B3729] ring-offset-2'
                                                                : 'border-gray-300'
                                                                }`}
                                                            style={{ backgroundColor: color.color }}
                                                            title={color.label}
                                                        />
                                                        <span className="text-xs text-gray-500">
                                                            {formatFilterCount(color.count)}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {activeMobileFilter === 'category' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">კატეგორია</h3>
                                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                            {filterCategories.map((category) => {
                                                const isSelected = selectedCategories.includes(category.name);
                                                const categoryCount = categoryCountsBySlug[category.slug] ?? 0

                                                return (
                                                    <label
                                                        key={category.slug}
                                                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleCategory(category.name)}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-[16px] text-black">{category.name}</span>
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {formatFilterCount(categoryCount)}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {activeMobileFilter === 'price' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფასის დიაპაზონი</h3>
                                        <PriceRangeFilter
                                            priceRange={priceRange as [number, number]}
                                            maxPrice={maxPrice}
                                            onChange={setPriceRange}
                                        />
                                    </div>
                                )}

                                {activeMobileFilter === 'location' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">მდებარეობა</h3>
                                        {locations.map((location) => {
                                            const active = selectedLocations.includes(location.id);
                                            return (
                                                <label
                                                    key={location.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${active
                                                        ? 'bg-[#1B3729] text-white'
                                                        : 'bg-gray-50 text-black hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={active}
                                                        onChange={() => toggleLocation(location.id)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-[16px]">{location.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {activeMobileFilter === 'vip' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">VIP პროდუქტები</h3>
                                        <label
                                            className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${onlyVip
                                                ? 'bg-[#1B3729] text-white'
                                                : 'bg-gray-50 text-black hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={onlyVip}
                                                    onChange={(e) => setOnlyVip(e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-[16px]">მხოლოდ VIP პროდუქტები</span>
                                            </span>
                                            <span className={`text-[16px] ${onlyVip ? 'text-white' : 'text-gray-600'}`}>
                                                {vipProductsCount}
                                            </span>
                                        </label>
                                        {vipProductsCount === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                VIP პროდუქტები გამოჩნდება მას შემდეგ, რაც გადაიხდება 2 ლარიანი გადასახადი.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeMobileFilter === 'discount' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფასდაკლებები</h3>
                                        <label
                                            className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${onlyDiscounted
                                                ? 'bg-[#1B3729] text-white'
                                                : 'bg-gray-50 text-black hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={onlyDiscounted}
                                                    onChange={(e) => setOnlyDiscounted(e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-[16px]">მხოლოდ ფასდაკლებული</span>
                                            </span>
                                            <span className={`text-[16px] ${onlyDiscounted ? 'text-white' : 'text-gray-600'}`}>
                                                {discountedProductsCount}
                                            </span>
                                        </label>
                                    </div>
                                )}

                                {activeMobileFilter === 'type' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ტიპი</h3>
                                        {[
                                            { value: "all", label: "ყველა" },
                                            { value: "rent-only", label: "მხოლოდ გაქირავება" },
                                            { value: "sale-only", label: "მხოლოდ ყიდვა" },
                                            { value: "rent-and-sale", label: "გაქირავება და ყიდვა" },
                                        ].map(({ value, label }) => {
                                            const active = purchaseType === value;
                                            return (
                                                <label
                                                    key={value}
                                                    className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${active
                                                        ? 'bg-[#1B3729] text-white'
                                                        : 'bg-gray-50 text-black hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="mobilePurchaseType"
                                                            checked={active}
                                                            onChange={() => setPurchaseType(value as PurchaseType)}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-[16px]">{label}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex gap-3">
                            <button
                                onClick={() => {
                                    clearFilters()
                                    setIsMobileFilterOverlayOpen(false)
                                }}
                                className="flex-1 px-4 py-3 bg-white text-black border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                            >
                                გაწმენდა
                            </button>
                            <button
                                onClick={() => setIsMobileFilterOverlayOpen(false)}
                                className="flex-1 px-4 py-3 bg-[#1B3729] text-white rounded-lg font-medium hover:bg-[#1B3729]"
                            >
                                ჩვენება
                            </button>
                        </div>
                    </div>
                )}

                {/* Desktop Filter Toggle (keep existing) */}


                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className={`lg:w-80 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-white shadow-sm p-6  top-24 space-y-6">
                            {/* Filter Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold text-black md:text-[20px] text-[16px]">ფილტრები</h3>
                                <button
                                    onClick={clearFilters}
                                    className="md:text-[20px] text-[16px] cursor-pointer text-black hover:text-black font-medium"
                                >
                                    გაწმენდა
                                </button>
                            </div>

                            {/* Price Range FIRST */}
                            <div className="border-b border-gray-200 pb-6">
                                <h2 className="font-medium text-black md:text-[18px] text-[16px] mb-3">ფასის დიაპაზონი</h2>
                                <PriceRangeFilter
                                    priceRange={priceRange as [number, number]}
                                    maxPrice={maxPrice}
                                    onChange={setPriceRange}
                                />
                            </div>

                            {/* VIP */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">VIP პროდუქტები</h4>
                                <label
                                    className={`flex items-center justify-between gap-2 cursor-pointer rounded-md px-3 py-2 ${onlyVip ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-black'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={onlyVip}
                                            onChange={(e) => setOnlyVip(e.target.checked)}
                                            className="w-4 h-4 accent-black"
                                        />
                                        მხოლოდ VIP პროდუქტები
                                    </span>
                                    <span className={`text-[16px] ${onlyVip ? 'text-black font-medium' : 'text-gray-600'}`}>
                                        {vipProductsCount}
                                    </span>
                                </label>
                                {vipProductsCount === 0 && (
                                    <p className="text-xs text-gray-500 mt-2 px-3">
                                        VIP პროდუქტები გამოჩნდება მას შემდეგ, რაც გადაიხდება 2 ლარიანი გადასახადი.
                                    </p>
                                )}
                            </div>

                            {/* Discounts */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">ფასდაკლებები</h4>
                                <label
                                    className={`flex items-center justify-between gap-2 cursor-pointer rounded-md px-3 py-2 ${onlyDiscounted ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-black'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={onlyDiscounted}
                                            onChange={(e) => setOnlyDiscounted(e.target.checked)}
                                            className="w-4 h-4 accent-black"
                                        />
                                        მხოლოდ ფასდაკლებული
                                    </span>
                                    <span className={`text-[16px] ${onlyDiscounted ? 'text-black font-medium' : 'text-gray-600'}`}>
                                        {discountedProductsCount}
                                    </span>
                                </label>
                            </div>

                            {/* Type */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">ტიპი</h4>
                                <div className="space-y-2 text-[15px] text-black">
                                    {[
                                        { value: "all", label: "ყველა" },
                                        { value: "rent-only", label: "მხოლოდ გაქირავება" },
                                        { value: "sale-only", label: "მხოლოდ ყიდვა" },
                                        { value: "rent-and-sale", label: "გაქირავება და ყიდვა" },
                                    ].map(({ value, label }) => {
                                        const active = purchaseType === value
                                        return (
                                            <label
                                                key={value}
                                                className={`flex items-center justify-between gap-2 cursor-pointer rounded-md px-3 py-2 ${active ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-black'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="purchaseType"
                                                        checked={active}
                                                        onChange={() => setPurchaseType(value as PurchaseType)}
                                                        className="w-4 h-4 accent-black"
                                                    />
                                                    {label}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">სქესი</h4>
                                <div className="space-y-2 text-[15px] text-black">
                                    {SHOP_GENDER_FILTER_OPTIONS.map(({ value, label }) => {
                                        const active =
                                            value === null
                                                ? !genderParam
                                                : genderParam === value
                                        return (
                                            <label
                                                key={label}
                                                className={`flex items-center justify-between gap-2 cursor-pointer rounded-md px-3 py-2 ${active ? 'bg-gray-100 text-black' : 'hover:bg-gray-100 text-black'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="genderFilter"
                                                        checked={active}
                                                        onChange={() => setGenderFilter(value)}
                                                        className="w-4 h-4 accent-black"
                                                    />
                                                    {label}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Category Filters */}
                            <div className="border-b border-gray-200 pb-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="w-full flex items-center justify-between mb-3"
                                >
                                    <h4 className="font-medium text-black md:text-[18px] text-[16px]">კატეგორია</h4>
                                    <ChevronDown className={`w-5 h-5 text-black transition-transform ${isCategoryOpen ? "rotate-180" : "rotate-0"}`} />
                                </button>
                                {isCategoryOpen && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {filterCategories.map((category) => {
                                            const isSelected = selectedCategories.includes(category.name);
                                            const categoryCount = categoryCountsBySlug[category.slug] ?? 0

                                            return (
                                                <label
                                                    key={category.slug}
                                                    className="flex items-center justify-between text-[15px] text-black cursor-pointer py-1"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleCategory(category.name)}
                                                            className="w-4 h-4"
                                                        />
                                                        {category.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatFilterCount(categoryCount)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Purchase Type Filter */}


                            {!isSizeOptionalShop && (
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">
                                    {isChildrenShop ? 'ასაკი' : 'ზომა'}
                                </h4>
                                <SizePillSelector
                                    mode="multiple"
                                    options={availableSizes.map((size) => ({
                                        value: size,
                                        label: size,
                                    }))}
                                    values={selectedSizes}
                                    onToggle={toggleSize}
                                    compact={isChildrenShop}
                                />
                            </div>
                            )}

                            {/* Location Filter (styled like type) */}
                            <div className="mb-6  pb-6">
                                <h2 className="font-medium text-black md:text-[18px] text-[16px] mb-3">მდებარეობა</h2>
                                <div className="space-y-2 text-[15px] text-black">
                                    {locations.map((location) => {
                                        const active = selectedLocations.includes(location.id)
                                        return (
                                            <label
                                                key={location.id}
                                                className={`flex items-center justify-between gap-2 cursor-pointer rounded-md px-3 py-2 ${active ? ' text-black' : 'hover:bg-gray-100 text-black'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={active}
                                                        onChange={() => toggleLocation(location.id)}
                                                        className="w-4 h-4 accent-black"
                                                    />
                                                    {location.label}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>


                            {/* Rental Date Filter */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-5 h-5 text-black" />
                                    <h4 className="font-medium text-black md:text-[20px] text-[16px]">გაქირავების თარიღი</h4>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block md:text-[18px] text-[16px] text-black mb-1">დაწყება</label>
                                        <DatePicker
                                            selected={rentalStartDate}
                                            onChange={(date: Date | null) => setRentalStartDate(date)}
                                            minDate={new Date()}
                                            placeholderText="აირჩიე თარიღი"
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2  border border-gray-300 rounded-md md:text-[18px] text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block md:text-[18px] text-[16px] text-black mb-1">დასრულება</label>
                                        <DatePicker
                                            selected={rentalEndDate}
                                            onChange={(date: Date | null) => setRentalEndDate(date)}
                                            minDate={rentalStartDate || new Date()}
                                            placeholderText="აირჩიე თარიღი"
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md md:text-[18px] text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Color Filter (moved below rental date) */}
                            <div className="mb-6  pb-6">
                                <h4 className="font-medium text-black md:text-[20px] text-[16px] mb-3">ფერი</h4>
                                <input
                                    type="text"
                                    value={colorSearch}
                                    onChange={(e) => handleColorSearchChange(e.target.value)}
                                    placeholder="მაგ. შავი, ლურჯი..."
                                    className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md md:text-[18px] text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                />
                                <div className="flex flex-wrap gap-4">
                                    {colorFacets.map((color) => {
                                        return (
                                            <div key={color.id} className="flex flex-col items-center gap-1">
                                                <button
                                                    onClick={() => toggleColor(color.id)}
                                                    className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 ${selectedColors.includes(color.id)
                                                        ? 'border-[#1B3729] ring-2 ring-[#1B3729] ring-offset-2'
                                                        : 'border-gray-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2'
                                                        }`}
                                                    style={{ backgroundColor: color.color }}
                                                    title={color.label}
                                                />
                                                <span className="text-xs text-gray-500">
                                                    {formatFilterCount(color.count)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Results Count */}

                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Top Bar with Sorting */}



                        {/* Products Grid */}
                        {currentProducts.length > 0 ? (
                            <ProductMasonryGrid
                                items={currentProducts}
                                getKey={(product) => product.id}
                                renderItem={(product, index) => {
                                    const purchaseLabel = getProductPurchaseLabel(product)
                                    return (
                                    <div className="group bg-white rounded-xl overflow-hidden transition-shadow flex flex-col lg:h-full">
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="relative w-full h-[273px] bg-gray-100 overflow-hidden">
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="relative block w-full h-full"
                                                    onClick={handleProductNavigate}
                                                >
                                                <Image
                                                    src={product.images?.[0]?.url || "/placeholder.jpg"}
                                                    alt={product.name}
                                                    fill
                                                    quality={PRODUCT_IMAGE_QUALITY}
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                                                    className="object-cover transition-transform duration-300 "
                                                    loading={index < 4 ? "eager" : "lazy"}
                                                    priority={index < 4}
                                                />
                                                </Link>

                                                {isProductVipActive(product) && (
                                                    <span className="absolute top-2 left-2 bg-[#1B3729] text-white text-xs font-semibold px-2 py-1 rounded-md z-10">
                                                        VIP
                                                    </span>
                                                )}

                                            </div>
                                        </div>
                                        <div className="mt-2 space-y-2 flex flex-col flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 min-w-0">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-regular text-black md:text-[18px] text-[16px] leading-snug line-clamp-2">
                                                        {product.name}
                                                    </h3>
                                                    {purchaseLabel && (
                                                        <p className="text-[#1B3729] md:text-[18px] text-[14px] font-regular mt-0.5">
                                                            {purchaseLabel}
                                                        </p>
                                                    )}
                                                </div>
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="w-9 h-9 shrink-0 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 transition"
                                                    aria-label="დეტალები"
                                                    onClick={handleProductNavigate}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </Link>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <ProductListPrice product={product} />
                                            </div>

                                            <ProductListDiscountBadge
                                                discount={product.discount ?? 0}
                                                discountDays={product.discountDays}
                                            />
                                            {product.stock !== undefined && (
                                                    <p className='text-black text-[16px] font-regular'>
                                                        მარაგში: {product.stock}
                                                    </p>
                                            )}

                                            <div className="flex items-center gap-2 lg:mt-auto">
                                                <StarRating
                                                    rating={product.rating && product.rating > 0 ? Math.round(product.rating) : 0}
                                                    readonly
                                                    size="sm"
                                                    color={product.rating && product.rating > 0 ? 'green' : 'silver'}
                                                />
                                                {product.rating && product.rating > 0 && (
                                                    <span className="text-black text-[14px] font-regular">
                                                        {product.rating.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    )
                                }}
                            />
                        ) : (
                            <div className="text-center py-16">
                                <h3 className="text-xl font-semibold text-black md:text-[20px] text-[16px] mb-2">
                                    პროდუქტები ვერ მოიძებნა
                                </h3>
                                <p className="text-black mb-6">
                                    სცადეთ სხვა ფილტრები
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="px-6 py-3 bg-[#1B3729] text-white rounded-lg font-medium hover:bg-[#1B3729] transition-colors md:text-[18px] text-[16px]"
                                >
                                    ფილტრების წაშლა
                                </button>
                            </div>
                        )}

                        {/* Pagination — desktop homepage + shop; hidden on mobile homepage */}
                        {showPagination && (
                            <div className="flex flex-col items-center justify-center gap-4 mt-8">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${currentPage === 1
                                            ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                            : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                            }`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        წინა
                                    </button>

                                    <span className="px-4 py-2 text-black md:text-[18px] text-[16px]">
                                        {currentPage}
                                    </span>

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={!serverHasMore}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${!serverHasMore
                                            ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                            : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                            }`}
                                    >
                                        შემდეგი
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {useHomeInfiniteScroll && currentProducts.length > 0 && serverHasMore && (
                            <div ref={loadMoreSentinelRef} className="h-12" aria-hidden />
                        )}

                        {useHomeInfiniteScroll && loadingMore && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B3729]" />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopPageClient
