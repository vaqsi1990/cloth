"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from '@/component/AppImage'
import Link from 'next/link'
import { Filter, X, ChevronDown, Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'
import DatePicker from "react-datepicker"
import StarRating from "@/components/StarRating"
import { PURPOSE_OPTIONS } from '@/data/purposes'
import { PRODUCT_COLORS, type ProductColorFacet } from '@/lib/product-colors'
import {
  PREDEFINED_LETTER_SIZES,
  formatFilterCount,
} from '@/lib/shop-product-filters'
import { appendShopListFilterParams, type ShopSortBy } from '@/lib/shop-list-params'
import { PRODUCT_IMAGE_QUALITY } from '@/lib/image-config'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  collectShopFilterCategories,
  dedupeProductCategories,
  findCategoryByParam,
  resolveCategorySlugParam,
  sortProductCategories,
  type ProductCategory,
} from '@/lib/product-categories'
import { isProductVipActive } from '@/lib/product-vip'
import ProductSalePrice from '@/components/ProductSalePrice'

type PurchaseType = 'all' | 'rent-only' | 'sale-only' | 'rent-and-sale'

const ShopPageClient = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const genderParam = searchParams.get('gender')
    const searchParam = searchParams.get('search')
    const purposeParam = searchParams.get('purpose')
    const categoryParam = searchParams.get('category')
    const discountParam = searchParams.get('discount')
    const vipParam = searchParams.get('vip')

    const [products, setProducts] = useState<Product[]>([])
    const [shopCategories, setShopCategories] = useState<ProductCategory[]>(
        DEFAULT_PRODUCT_CATEGORIES,
    )
    const [loading, setLoading] = useState(true)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 0])
    const [maxPrice, setMaxPrice] = useState(0)
    const [selectedSizeSystems, setSelectedSizeSystems] = useState<string[]>([])
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [colorFacets, setColorFacets] = useState<ProductColorFacet[]>(() =>
        PRODUCT_COLORS.map((color) => ({ ...color, count: 0 })),
    )
    const [availableSizes, setAvailableSizes] = useState<string[]>(PREDEFINED_LETTER_SIZES)
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])

    const [rentalStartDate, setRentalStartDate] = useState<Date | null>(null)
    const [rentalEndDate, setRentalEndDate] = useState<Date | null>(null)
    const [purchaseType, setPurchaseType] = useState<PurchaseType>("all")
    const [onlyDiscounted, setOnlyDiscounted] = useState(false)
    const [onlyVip, setOnlyVip] = useState(false)
    const [productRentalStatus, setProductRentalStatus] = useState<Record<number, {
        variantId: number;
        size: string;
        stock: number;
        activeRentals: Array<{ startDate: string; endDate: string; status: string }>;
        isAvailable: boolean;
    }[]>>({})
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [isSizeOpen, setIsSizeOpen] = useState(false)

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
    const productsFetchIdRef = useRef(0)
    const rentalFetchIdRef = useRef(0)
    const shopInitializedRef = useRef(false)
    const prevPurposeParamRef = useRef(purposeParam)
    const prevCategoryParamRef = useRef(categoryParam)
    const filtersSnapshotRef = useRef<string | null>(null)
    const [savedScrollY, setSavedScrollY] = useState<number | null>(null)
    const [hasRestoredState, setHasRestoredState] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            scrollYRef.current = window.scrollY
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const saveState = useCallback(() => {
        if (typeof window === 'undefined') return
        const state = {
            selectedCategories,
            selectedPurposes,
            priceRange,
            selectedSizeSystems,
            selectedSizes,
            selectedColors,
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
        sessionStorage.setItem('shopPageState', JSON.stringify(state))
    }, [
        selectedCategories,
        selectedPurposes,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        currentPage
    ])

    // Restore saved state once on mount; URL params override session values
    useEffect(() => {
        if (typeof window === 'undefined') return

        let restoredCategories: string[] = []
        let restoredPurposes: string[] = []
        let restoredPriceRange: [number, number] = [0, 0]
        let restoredSizeSystems: string[] = []
        let restoredSizes: string[] = []
        let restoredColors: string[] = []
        let restoredLocations: string[] = []
        let restoredRentalStart: Date | null = null
        let restoredRentalEnd: Date | null = null
        let restoredSortBy = 'newest'
        let restoredPurchaseType: PurchaseType = 'all'
        let restoredOnlyDiscounted = false
        let restoredOnlyVip = false
        let restoredPage = 1
        let restoredScrollY: number | null = null

        const saved = sessionStorage.getItem('shopPageState')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                restoredCategories = parsed.selectedCategories || []
                restoredPurposes = parsed.selectedPurposes || []
                restoredPriceRange = parsed.priceRange || [0, 0]
                restoredSizeSystems = parsed.selectedSizeSystems || []
                restoredSizes = parsed.selectedSizes || []
                restoredColors = parsed.selectedColors || []
                restoredLocations = parsed.selectedLocations || []
                restoredRentalStart = parsed.rentalStartDate ? new Date(parsed.rentalStartDate) : null
                restoredRentalEnd = parsed.rentalEndDate ? new Date(parsed.rentalEndDate) : null
                restoredSortBy = parsed.sortBy || 'newest'
                restoredPurchaseType = parsed.purchaseType || 'all'
                restoredOnlyDiscounted = Boolean(parsed.onlyDiscounted)
                restoredOnlyVip = Boolean(parsed.onlyVip)
                restoredPage = parsed.currentPage || 1
                restoredScrollY = typeof parsed.scrollY === 'number' ? parsed.scrollY : null
            } catch (e) {
                console.warn('Failed to restore shop state', e)
            }
        }

        const initialCategory = categoryParam
            ? findCategoryByParam(categoryParam, DEFAULT_PRODUCT_CATEGORIES)?.name ??
              categoryParam
            : restoredCategories
        setSelectedCategories(
            Array.isArray(initialCategory) ? initialCategory : [initialCategory].filter(Boolean),
        )
        setSelectedPurposes(purposeParam ? [purposeParam] : restoredPurposes)
        setPriceRange(restoredPriceRange)
        setSelectedSizeSystems(restoredSizeSystems)
        setSelectedSizes(restoredSizes)
        setSelectedColors(restoredColors)
        setSelectedLocations(restoredLocations)
        setRentalStartDate(restoredRentalStart)
        setRentalEndDate(restoredRentalEnd)
        setSortBy(restoredSortBy)
        setPurchaseType(restoredPurchaseType)
        setOnlyDiscounted(discountParam === 'true' || restoredOnlyDiscounted)
        setOnlyVip(vipParam === 'true' || restoredOnlyVip)
        setCurrentPage(restoredPage)
        setSavedScrollY(restoredScrollY)

        shopInitializedRef.current = true
        prevPurposeParamRef.current = purposeParam
        prevCategoryParamRef.current = categoryParam
        setHasRestoredState(true)
    }, [])

    // Sync URL purpose/category changes after initial restore (client navigation)
    useEffect(() => {
        if (!shopInitializedRef.current) return
        if (prevPurposeParamRef.current === purposeParam) return
        prevPurposeParamRef.current = purposeParam
        setSelectedPurposes(purposeParam ? [purposeParam] : [])
    }, [purposeParam])

    useEffect(() => {
        if (!shopInitializedRef.current) return
        if (prevCategoryParamRef.current === categoryParam) return
        prevCategoryParamRef.current = categoryParam
        const resolved = categoryParam
            ? findCategoryByParam(categoryParam, shopCategories)?.name ?? categoryParam
            : null
        setSelectedCategories(resolved ? [resolved] : [])
    }, [categoryParam, shopCategories])

    // Save when key filters/page change (skip until restore completes)
    useEffect(() => {
        if (!hasRestoredState) return
        saveState()
    }, [
        selectedCategories,
        selectedPurposes,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
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
    const [scrollRestored, setScrollRestored] = useState(false)
    useEffect(() => {
        if (!loading && hasRestoredState && !scrollRestored && savedScrollY !== null) {
            window.scrollTo(0, savedScrollY)
            setScrollRestored(true)
        }
    }, [loading, hasRestoredState, scrollRestored, savedScrollY])

    const clearSearch = () => {
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        params.delete('search')
        const query = params.toString()
        router.push(query ? `/shop?${query}` : '/shop')
    }

    const clearPurpose = () => {
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        params.delete('purpose')
        const query = params.toString()
        router.push(query ? `/shop?${query}` : '/shop')
    }

    // Helper functions for price calculation
    const getRentalPrice = (product: Product): number => {
        if (!product.isRentable || !product.rentalPriceTiers || product.rentalPriceTiers.length === 0) {
            return 0
        }
        // Sort tiers by minDays to get the first tier (lowest minDays)
        const sortedTiers = [...product.rentalPriceTiers].sort((a, b) => a.minDays - b.minDays)
        const tier0 = sortedTiers[0]
        return tier0.pricePerDay * tier0.minDays
    }

    const getDisplayPrice = (product: Product): number => {
        // First check if product has variants with prices
        if (product.variants && product.variants.length > 0) {
            const prices = product.variants.map(v => v.price).filter(p => p > 0)
            // If all prices are 0 or no positive prices, check rental
            if (prices.length === 0) {
                return getRentalPrice(product)
            }
            const minBuyPrice = Math.min(...prices)
            // If min buy price is 0, show rental price instead
            if (minBuyPrice === 0) {
                const rentalPrice = getRentalPrice(product)
                return rentalPrice > 0 ? rentalPrice : 0
            }
            return minBuyPrice
        }
        // If no variants, check if it's rentable
        return getRentalPrice(product)
    }

    const purposes = PURPOSE_OPTIONS

    const resolveCategoryApiSlug = useCallback(
        (param: string | null, selected: string[]) => {
            if (param) return resolveCategorySlugParam(param)
            if (selected.length === 1) {
                const cat =
                    shopCategories.find((c) => c.name === selected[0]) ||
                    findCategoryByParam(selected[0], shopCategories)
                return cat?.slug ?? resolveCategorySlugParam(selected[0])
            }
            return null
        },
        [shopCategories],
    )

    const shopListFilters = useCallback(
        () => ({
            selectedColors,
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
            selectedSizes,
            selectedSizeSystems,
            selectedLocations,
            priceRange,
            maxPrice,
            purchaseType,
            sortBy,
        ],
    )

    const appendBaseProductParams = useCallback(
        (params: URLSearchParams) => {
            if (genderParam) {
                params.append('gender', genderParam)
            }
            if (searchParam) {
                params.append('search', searchParam)
            }
            if (purposeParam) {
                params.append('purpose', purposeParam)
            } else if (selectedPurposes.length === 1) {
                params.append('purpose', selectedPurposes[0])
            }
            const categorySlug = resolveCategoryApiSlug(
                categoryParam,
                selectedCategories,
            )
            if (categorySlug) {
                params.append('category', categorySlug)
            }
            if (onlyDiscounted) {
                params.append('hasDiscount', 'true')
            }
            if (onlyVip) {
                params.append('isVip', 'true')
            }
            appendShopListFilterParams(params, shopListFilters())
        },
        [
            genderParam,
            searchParam,
            purposeParam,
            categoryParam,
            selectedCategories,
            selectedPurposes,
            onlyDiscounted,
            onlyVip,
            resolveCategoryApiSlug,
            shopListFilters,
        ],
    )

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

    const sizeSystems = [
        { id: "EU", label: "EU" },
        { id: "US", label: "US" },
        { id: "UK", label: "UK" },
        { id: "CN", label: "CN" }
    ]

    const filterCategories = React.useMemo(
        () => collectShopFilterCategories(),
        [],
    )

    const locations = [
        { id: "თბილისი", label: "თბილისი" },
        { id: "ქუთაისი", label: "ქუთაისი" },
        { id: "რუსთავი", label: "რუსთავი" },
        { id: "ბათუმი", label: "ბათუმი" }
    ]

    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const refreshFilterCounts = useCallback(async (signal?: AbortSignal) => {
        try {
            const params = new URLSearchParams()
            if (genderParam) params.append('gender', genderParam)
            if (searchParam) params.append('search', searchParam)
            if (purposeParam) {
                params.append('purpose', purposeParam)
            } else if (selectedPurposes.length === 1) {
                params.append('purpose', selectedPurposes[0])
            }
            const categorySlug = resolveCategoryApiSlug(categoryParam, selectedCategories)
            if (categorySlug) params.append('category', categorySlug)

            const response = await fetch(`/api/products/filter-counts?${params}`, { signal })
            const data = await response.json()
            if (data.success) {
                setVipProductsCount(data.vipCount ?? 0)
                setDiscountedProductsCount(data.discountCount ?? 0)
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') return
        }
    }, [
        genderParam,
        searchParam,
        purposeParam,
        categoryParam,
        selectedCategories,
        selectedPurposes,
        resolveCategoryApiSlug,
    ])

    // Fetch products from API (server-side pagination: 16 per page)
    useEffect(() => {
        if (!hasRestoredState) return

        const fetchId = ++productsFetchIdRef.current
        const controller = new AbortController()
        const isStale = () => fetchId !== productsFetchIdRef.current

        const fetchProducts = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.set('page', String(currentPage))
                params.set('limit', String(itemsPerPage))
                appendBaseProductParams(params)
                const url = `/api/products?${params}`
                const t0 = performance.now()
                const response = await fetch(url, { signal: controller.signal })
                if (isStale()) return

                const tHeaders = performance.now()
                const data = await response.json()
                if (isStale()) return

                const tDone = performance.now()
                if (process.env.NODE_ENV === 'development') {
                    const st = response.headers.get('server-timing')
                    const resourceUrl = new URL(url, window.location.origin).href
                    const entries = performance.getEntriesByName(
                        resourceUrl,
                        'resource',
                    ) as PerformanceResourceTiming[]
                    const rt = entries[entries.length - 1]
                    const ttfbMs = rt ? rt.responseStart - rt.requestStart : null
                    const downloadMs = rt ? rt.responseEnd - rt.responseStart : null
                    const gapMs =
                        ttfbMs !== null ? Math.max(0, tHeaders - t0 - ttfbMs) : null
                    console.log('[ShopPageClient] /api/products', {
                        totalMs: Math.round(tDone - t0),
                        ttfbMs: ttfbMs !== null ? Math.round(ttfbMs) : null,
                        downloadMs: downloadMs !== null ? Math.round(downloadMs) : null,
                        jsonParseMs: Math.round(tDone - tHeaders),
                        compileOrQueueMs: gapMs !== null ? Math.round(gapMs) : null,
                        serverTiming: st ?? null,
                        timings: data.timings ?? null,
                    })
                }
                if (data.success) {
                    if (process.env.NODE_ENV === 'development' && purposeParam) {
                        console.log(`[ShopPageClient] Fetched ${data.products.length} products for purpose: ${purposeParam}`)
                    }
                    setProducts(data.products)
                    setServerTotalPages(data.totalPages ?? 1)
                    setServerTotalCount(data.totalCount ?? data.products.length)
                    setServerHasMore(Boolean(data.hasMore))
                    setIsTotalPagesKnown(data.totalPages !== null && data.totalPages !== undefined)

                    const allPrices = data.products.flatMap((product: Product) => {
                        const prices: number[] = []
                        // Add buy prices
                        if (product.variants && product.variants.length > 0) {
                            prices.push(...product.variants.map(variant => variant.price))
                        }
                        // Add rental prices if product is rentable
                        if (product.isRentable && product.rentalPriceTiers && product.rentalPriceTiers.length > 0) {
                            const sortedTiers = [...product.rentalPriceTiers].sort((a, b) => a.minDays - b.minDays)
                            const tier0 = sortedTiers[0]
                            prices.push(tier0.pricePerDay * tier0.minDays)
                        }
                        return prices
                    })
                    const calculatedMaxPrice = allPrices.length > 0 ? Math.max.apply(null, allPrices) : 200
                    setMaxPrice(calculatedMaxPrice)

                    // Update price range if current max is higher than calculated max
                    if (calculatedMaxPrice > priceRange[1] || priceRange[1] === 0) {
                        setPriceRange([0, calculatedMaxPrice])
                    }

                    void refreshFilterCounts()
                }
            } catch (error: unknown) {
                // Effect cleanup / StrictMode re-run aborts the previous in-flight request.
                if (
                    isStale() ||
                    controller.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError')
                ) {
                    return
                }
                console.error('Error fetching products:', error)
            } finally {
                if (!isStale()) {
                    setLoading(false)
                }
            }
        }

        void fetchProducts()
        return () => controller.abort('cleanup')
    }, [
        hasRestoredState,
        currentPage,
        genderParam,
        searchParam,
        purposeParam,
        categoryParam,
        selectedCategories,
        selectedPurposes,
        selectedColors,
        selectedSizes,
        selectedSizeSystems,
        selectedLocations,
        priceRange,
        maxPrice,
        purchaseType,
        sortBy,
        onlyDiscounted,
        onlyVip,
        appendBaseProductParams,
        refreshFilterCounts,
    ])

    // Fetch VIP count from server (includes BOG sync for pending payments)
    useEffect(() => {
        if (!hasRestoredState) return

        const controller = new AbortController()
        void refreshFilterCounts(controller.signal)
        return () => controller.abort('cleanup')
    }, [hasRestoredState, refreshFilterCounts])

    // Fast color facets (single lightweight SQL query, cached on CDN)
    useEffect(() => {
        if (!hasRestoredState) return

        const controller = new AbortController()

        const fetchColorFacets = async () => {
            try {
                const params = new URLSearchParams()
                if (genderParam) params.append('gender', genderParam)
                if (searchParam) params.append('search', searchParam)
                if (purposeParam) {
                    params.append('purpose', purposeParam)
                } else if (selectedPurposes.length === 1) {
                    params.append('purpose', selectedPurposes[0])
                }
                const categorySlug = resolveCategoryApiSlug(
                    categoryParam,
                    selectedCategories,
                )
                if (categorySlug) params.append('category', categorySlug)

                const response = await fetch(
                    `/api/products/color-facets?${params}`,
                    { signal: controller.signal },
                )
                const data = await response.json()
                if (data.success && Array.isArray(data.colors)) {
                    setColorFacets(data.colors)
                }
            } catch (error: unknown) {
                if (
                    controller.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError')
                ) {
                    return
                }
                console.error('Error fetching color facets:', error)
            }
        }

        void fetchColorFacets()
        return () => controller.abort('cleanup')
    }, [
        hasRestoredState,
        genderParam,
        searchParam,
        purposeParam,
        categoryParam,
        selectedCategories,
        selectedPurposes,
        resolveCategoryApiSlug,
    ])

    // Size options from DB (numeric sizes) + predefined letter sizes
    useEffect(() => {
        if (!hasRestoredState) return

        const controller = new AbortController()

        const fetchSizeFacets = async () => {
            try {
                const params = new URLSearchParams()
                if (genderParam) params.append('gender', genderParam)
                if (searchParam) params.append('search', searchParam)
                if (purposeParam) {
                    params.append('purpose', purposeParam)
                } else if (selectedPurposes.length === 1) {
                    params.append('purpose', selectedPurposes[0])
                }
                const categorySlug = resolveCategoryApiSlug(
                    categoryParam,
                    selectedCategories,
                )
                if (categorySlug) params.append('category', categorySlug)

                const response = await fetch(
                    `/api/products/size-facets?${params}`,
                    { signal: controller.signal },
                )
                const data = await response.json()
                if (data.success && Array.isArray(data.sizes) && data.sizes.length > 0) {
                    setAvailableSizes(data.sizes)
                }
            } catch (error: unknown) {
                if (
                    controller.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError')
                ) {
                    return
                }
                console.error('Error fetching size facets:', error)
            }
        }

        void fetchSizeFacets()
        return () => controller.abort('cleanup')
    }, [
        hasRestoredState,
        genderParam,
        searchParam,
        purposeParam,
        categoryParam,
        selectedCategories,
        selectedPurposes,
        resolveCategoryApiSlug,
    ])

    // Fetch rental status for rentable products on current page (batched)
    useEffect(() => {
        const rentableIds = products.filter((p) => p.isRentable).map((p) => p.id)
        if (rentableIds.length === 0) {
            setProductRentalStatus({})
            return
        }

        const fetchId = ++rentalFetchIdRef.current
        const controller = new AbortController()
        const isStale = () => fetchId !== rentalFetchIdRef.current

        const fetchRentalStatus = async () => {
            try {
                const productIds = rentableIds.join(',')
                const response = await fetch(
                    `/api/products/rental-status?ids=${productIds}`,
                    { signal: controller.signal },
                )
                if (isStale()) return

                const data = await response.json()
                if (isStale()) return

                if (data.success && data.statuses) {
                    setProductRentalStatus(data.statuses)
                }
            } catch (error: unknown) {
                if (
                    isStale() ||
                    controller.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError')
                ) {
                    return
                }
                console.error('Error fetching batch rental status:', error)
            }
        }

        void fetchRentalStatus()
        return () => controller.abort('cleanup')
    }, [products])

    // Check if product is available during selected dates
    const isProductAvailable = (product: Product): boolean => {
        if (!rentalStartDate || !rentalEndDate || !product.isRentable) return true

        const variants = productRentalStatus[product.id]
        if (!variants || variants.length === 0) return true

        const start = new Date(rentalStartDate)
        const end = new Date(rentalEndDate)

        // Check if any variant has availability for the selected dates
        return variants.some((variant: {
            variantId: number;
            size: string;
            stock: number;
            activeRentals: Array<{ startDate: string; endDate: string; status: string }>;
            isAvailable: boolean;
        }) => {
            const activeRentals = variant.activeRentals || []

            // Check if there are any conflicts
            const hasConflict = activeRentals.some((period: { startDate: string; endDate: string; status: string }) => {
                const periodStart = new Date(period.startDate)
                const periodEnd = new Date(period.endDate)
                const periodLastBlockedDate = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)

                return start < periodLastBlockedDate && end >= periodStart
            })

            return !hasConflict
        })
    }

    // Server-side filtered page; rental dates applied client-side on current page only
    const currentProducts = products.filter((product) => isProductAvailable(product))

    const showPagination = currentPage > 1 || serverHasMore

    // Reset to page 1 when filters change (skip initial restore snapshot)
    useEffect(() => {
        if (!hasRestoredState) return

        const snapshot = JSON.stringify({
            selectedCategories,
            selectedPurposes,
            priceRange,
            selectedSizeSystems,
            selectedSizes,
            selectedColors,
            selectedLocations,
            rentalStartDate: rentalStartDate?.toISOString() ?? null,
            rentalEndDate: rentalEndDate?.toISOString() ?? null,
            sortBy,
            purchaseType,
            onlyDiscounted,
            onlyVip,
            purposeParam,
            categoryParam,
            genderParam,
            searchParam,
            discountParam,
            vipParam,
        })

        if (filtersSnapshotRef.current === null) {
            filtersSnapshotRef.current = snapshot
            return
        }

        if (filtersSnapshotRef.current !== snapshot) {
            filtersSnapshotRef.current = snapshot
            setCurrentPage(1)
        }
    }, [
        hasRestoredState,
        selectedCategories,
        selectedPurposes,
        priceRange,
        selectedSizeSystems,
        selectedSizes,
        selectedColors,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        onlyDiscounted,
        onlyVip,
        purposeParam,
        categoryParam,
        genderParam,
        searchParam,
        discountParam,
        vipParam,
    ])

    // Handle category selection
    const toggleCategory = (categoryName: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryName)
                ? prev.filter(c => c !== categoryName)
                : [...prev, categoryName]
        )
    }

    const togglePurpose = (purposeSlug: string) => {
        setSelectedPurposes(prev =>
            prev.includes(purposeSlug)
                ? prev.filter(p => p !== purposeSlug)
                : [...prev, purposeSlug]
        )
    }

    // Handle size system selection
    const toggleSizeSystem = (sizeSystem: string) => {
        setSelectedSizeSystems(prev =>
            prev.includes(sizeSystem)
                ? prev.filter(s => s !== sizeSystem)
                : [...prev, sizeSystem]
        )
    }

    // Handle size selection (case-insensitive)
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
    const toggleColor = (color: string) => {
        setSelectedColors(prev =>
            prev.includes(color)
                ? [] // თუ იგივე ფერია, გაუქმდება
                : [color] // თუ სხვა ფერია, მხოლოდ ის იქნება არჩეული
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
    const clearFilters = () => {
        // Clear sessionStorage first
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('shopPageState')
        }
        
        // Clear all state filters immediately
        setSelectedCategories([])
        setSelectedPurposes([])
        setSelectedSizeSystems([])
        setSelectedSizes([])
        setSelectedColors([])
        setSelectedLocations([])
        setRentalStartDate(null)
        setRentalEndDate(null)
        setPurchaseType("all")
        setOnlyDiscounted(false)
        setOnlyVip(false)
        setCurrentPage(1)
        
        // Price range will be updated when products are fetched
        // Set to 0 initially, will be updated by useEffect when products load
        setPriceRange([0, 0])
        
        // Navigate to home page (remove all URL parameters including gender)
        router.replace('/')
    }

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
                {/* Mobile Filter Bar - Temu Style */}
                <div className="lg:hidden mb-4">
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="flex items-center justify-center px-2 py-2">
                            <button
                                onClick={() => {
                                    setIsMobileFilterOverlayOpen(true)
                                    setActiveMobileFilter('size')
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
                                        onClick={() => setActiveMobileFilter('size')}
                                        className={`w-full text-left px-3 py-2 text-[16px] font-medium rounded mb-1 ${activeMobileFilter === 'size'
                                            ? 'bg-[#1B3729] text-white'
                                            : 'text-black hover:bg-gray-200'
                                            }`}
                                    >
                                        ზომა
                                    </button>
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
                                {activeMobileFilter === 'size' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h3 className="text-lg font-semibold text-black mb-4">ზომის სისტემა</h3>
                                            {sizeSystems.map((sizeSystem) => (
                                                <label
                                                    key={sizeSystem.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSizeSystems.includes(sizeSystem.id)}
                                                        onChange={() => toggleSizeSystem(sizeSystem.id)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-[16px] text-black">{sizeSystem.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="space-y-3">
                                                <h3 className="text-lg font-semibold text-black mb-4">ზომა</h3>
                                                <div className="space-y-2">
                                                    {availableSizes.map((size) => {
                                                        const isSelected = selectedSizes.some(selectedSize => {
                                                            const selectedSizeUpper = selectedSize.toUpperCase()
                                                            const sizeUpper = size.toUpperCase()
                                                            return selectedSize === size || selectedSizeUpper === sizeUpper
                                                        })
                                                        return (
                                                            <label
                                                                key={size}
                                                                className="flex items-center justify-between text-[16px] text-black cursor-pointer py-1"
                                                            >
                                                                <span className="flex items-center gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleSize(size)}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    <span>{size}</span>
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                    </div>
                                )}

                                {activeMobileFilter === 'color' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფერი</h3>
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
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {activeMobileFilter === 'price' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფასის დიაპაზონი</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxPrice}
                                                    value={priceRange[0]}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value) || 0
                                                        setPriceRange([Math.min(val, priceRange[1]), priceRange[1]])
                                                    }}
                                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded text-[14px] text-black"
                                                />
                                                <input
                                                    type="number"
                                                    min={priceRange[0]}
                                                    max={maxPrice}
                                                    value={priceRange[1]}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value) || 0
                                                        setPriceRange([priceRange[0], Math.max(val, priceRange[0])])
                                                    }}
                                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded text-[14px] text-black"
                                                />
                                            </div>
                                            {maxPrice > 0 && (
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={maxPrice}
                                                    value={priceRange[1]}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0
                                                        setPriceRange([priceRange[0], val])
                                                    }}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                                />
                                            )}
                                            <div className="flex items-center justify-between md:text-[16px] text-[14px] text-black">
                                                <span>₾{priceRange[0]}</span>
                                                <span>₾{priceRange[1]}</span>
                                            </div>
                                        </div>
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
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={priceRange[0]}
                                            onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                                            className="w-1/2 px-3 py-2 border border-gray-300 rounded text-[14px] text-black"
                                        />
                                        <input
                                            type="number"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 0])}
                                            className="w-1/2 px-3 py-2 border border-gray-300 rounded text-[14px] text-black"
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxPrice}
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    />
                                    <div className="flex items-center justify-between md:text-[16px] text-[14px] text-black">
                                        <span>₾{priceRange[0]}</span>
                                        <span>₾{priceRange[1]}</span>
                                    </div>
                                </div>
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

                            {/* Purpose Filters */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">დანიშნულება</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {purposes.map((purpose) => {
                                        const isSelected = selectedPurposes.includes(purpose.slug)

                                        return (
                                            <label
                                                key={purpose.slug}
                                                className="flex items-center justify-between text-[15px] text-black cursor-pointer py-1"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => togglePurpose(purpose.slug)}
                                                        className="w-4 h-4"
                                                    />
                                                    {purpose.name}
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
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Purchase Type Filter */}


                            {/* Size System Filter */}
                            <div className="border-b border-gray-200 pb-6">
                                <h2 className="font-medium text-black md:text-[18px] text-[16px] mb-3">ზომის სისტემა</h2>
                                <div className="space-y-2">
                                    {sizeSystems.map((sizeSystem) => (
                                        <label
                                            key={sizeSystem.id}
                                            className="flex items-center gap-2 text-[15px] text-black cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSizeSystems.includes(sizeSystem.id)}
                                                onChange={() => toggleSizeSystem(sizeSystem.id)}
                                                className="w-4 h-4"
                                            />
                                            {sizeSystem.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Size Filter */}
                            <div className="border-b border-gray-200 pb-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsSizeOpen(!isSizeOpen)}
                                        className="w-full flex items-center justify-between mb-3"
                                    >
                                        <h4 className="font-medium text-black md:text-[18px] text-[16px]">ზომა</h4>
                                        <ChevronDown className={`w-5 h-5 text-black transition-transform ${isSizeOpen ? "rotate-180" : "rotate-0"}`} />
                                    </button>
                                    {isSizeOpen && (
                                        <div className="space-y-2 overflow-hidden">
                                            {availableSizes.map((size) => {
                                                const isSelected = selectedSizes.some(selectedSize => {
                                                    const selectedSizeUpper = selectedSize.toUpperCase()
                                                    const sizeUpper = size.toUpperCase()
                                                    return selectedSize === size || selectedSizeUpper === sizeUpper
                                                })
                                                return (
                                                    <label
                                                        key={size}
                                                        className="flex items-center justify-between text-[15px] text-black cursor-pointer py-1"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSize(size)}
                                                                className="w-4 h-4"
                                                            />
                                                            {size}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

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
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-16 mb-8">
                                {currentProducts.map((product, index) => (
                                    <div
                                        key={product.id}
                                        className="group bg-white rounded-xl  overflow-hidden  transition-shadow"
                                    >
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="relative w-full h-[273px] bg-gray-100 overflow-hidden">
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="relative block w-full h-full"
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
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between">

                                                <h3 className="font-regular text-black md:text-[18px] text-[16px] leading-snug line-clamp-2">
                                                    {product.name}
                                                </h3>
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 transition"
                                                    aria-label="დეტალები"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </Link>

                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <ProductSalePrice
                                                    originalPrice={getDisplayPrice(product)}
                                                    discount={product.discount}
                                                />
                                            </div>

                                            {product.discount && product.discount > 0 && (
                                                <div className="bg-[#1B3729] rounded-md text-[#FFFFFF] font-regular flex items-center">

                                                <div className='px-2 py-1 text-[15px] flex flex-col md:flex-row items-center gap-2 flex-1'>
                                                    <span className='whitespace-nowrap'>დანაზოგი: ₾{product.discount.toFixed(2)}</span>
                                                    {product.discountDays && (
                                                        <span className="bg-white text-black px-3 py-1 rounded whitespace-nowrap">{product.discountDays} დღე</span>
                                                    )}
                                                </div>
                                                </div>
                                            )}
                                            {product.stock !== undefined && (
                                                <p className='text-black text-[16px] font-regular'>
                                                    მარაგში: {product.stock}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2">
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
                                ))}
                            </div>
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

                        {/* Pagination */}
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

                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopPageClient
