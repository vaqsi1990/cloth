"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Filter, X, ChevronDown, Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'
import DatePicker from "react-datepicker"
import StarRating from "@/components/StarRating"
import { PURPOSE_OPTIONS } from '@/data/purposes'


const ShopPageClient = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const genderParam = searchParams.get('gender')
    const searchParam = searchParams.get('search')
    const purposeParam = searchParams.get('purpose')
    const categoryParam = searchParams.get('category')

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 0])
    const [maxPrice, setMaxPrice] = useState(0)
    const [selectedSizeSystems, setSelectedSizeSystems] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])

    const [rentalStartDate, setRentalStartDate] = useState<Date | null>(null)
    const [rentalEndDate, setRentalEndDate] = useState<Date | null>(null)
    const [purchaseType, setPurchaseType] = useState<"all" | "rent-only" | "sale-only">("all")
    const [productRentalStatus, setProductRentalStatus] = useState<Record<number, {
        variantId: number;
        size: string;
        stock: number;
        activeRentals: Array<{ startDate: string; endDate: string; status: string }>;
        isAvailable: boolean;
    }[]>>({})
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20)
    const [activeMobileFilter, setActiveMobileFilter] = useState<string | null>(null)
    const [isMobileFilterOverlayOpen, setIsMobileFilterOverlayOpen] = useState(false)
    const [isCategorySectionOpen, setIsCategorySectionOpen] = useState(false)

    // Persist state across navigation
    const scrollYRef = useRef(0)
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
            selectedColors,
            selectedLocations,
            rentalStartDate: rentalStartDate ? rentalStartDate.toISOString() : null,
            rentalEndDate: rentalEndDate ? rentalEndDate.toISOString() : null,
            sortBy,
            purchaseType,
            currentPage,
            scrollY: scrollYRef.current,
        }
        sessionStorage.setItem('shopPageState', JSON.stringify(state))
    }, [
        selectedCategories,
        selectedPurposes,
        priceRange,
        selectedSizeSystems,
        selectedColors,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
        currentPage
    ])

    // Restore saved state on mount
    useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = sessionStorage.getItem('shopPageState')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setSelectedCategories(parsed.selectedCategories || [])
                setSelectedPurposes(parsed.selectedPurposes || [])
                setPriceRange(parsed.priceRange || [0, 0])
                setSelectedSizeSystems(parsed.selectedSizeSystems || [])
                setSelectedColors(parsed.selectedColors || [])
                setSelectedLocations(parsed.selectedLocations || [])
                setRentalStartDate(parsed.rentalStartDate ? new Date(parsed.rentalStartDate) : null)
                setRentalEndDate(parsed.rentalEndDate ? new Date(parsed.rentalEndDate) : null)
                setSortBy(parsed.sortBy || 'newest')
                setPurchaseType(parsed.purchaseType || 'all')
                setCurrentPage(parsed.currentPage || 1)
                setSavedScrollY(typeof parsed.scrollY === 'number' ? parsed.scrollY : null)
            } catch (e) {
                console.warn('Failed to restore shop state', e)
            }
        }
        setHasRestoredState(true)
    }, [])

    // Save when key filters/page change
    useEffect(() => {
        saveState()
    }, [
        selectedCategories,
        selectedPurposes,
        priceRange,
        selectedSizeSystems,
        selectedColors,
        selectedLocations,
        rentalStartDate,
        rentalEndDate,
        sortBy,
        purchaseType,
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

    useEffect(() => {
        if (purposeParam) {
            setSelectedPurposes([purposeParam])
        } else {
            // Only clear if we're not restoring from sessionStorage
            if (hasRestoredState) {
                setSelectedPurposes([])
            }
        }
    }, [purposeParam, hasRestoredState])

    // Set category from URL parameter
    useEffect(() => {
        if (categoryParam) {
            setSelectedCategories([categoryParam])
        } else {
            // Only clear if we're not restoring from sessionStorage
            if (hasRestoredState) {
                setSelectedCategories([])
            }
        }
    }, [categoryParam, hasRestoredState])

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

    const categories = [
        // ძირითადი
        { id: "კაბები", label: "კაბები", slug: "dresses" },
        { id: "ბლუზები", label: "ბლუზები", slug: "tops" },
        { id: "შარვლები", label: "შარვლები", slug: "pants" },
        { id: "ქვედაბოლოები", label: "ქვედაბოლოები", slug: "skirts" },
        { id: "ზედა ტანსაცმელი", label: "ზედა ტანსაცმელი", slug: "outerwear" },
        { id: "პალტოები და მოსასხამი", label: "პალტოები და მოსასხამი", slug: "coats" },

        // საქორწინო და სადღესასწაულო
        { id: "საქორწინო კაბები", label: "საქორწინო კაბები", slug: "wedding-dresses" },
        { id: "საღამოს ტანსაცმელი", label: "საღამოს ტანსაცმელი", slug: "evening-wear" },

        // სპორტული და სათხილამურო
        { id: "სათხილამურო ქურთუკი", label: "სათხილამურო ქურთუკი", slug: "ski-jacket" },
        { id: "თერმო ტანსაცმელი", label: "თერმო ტანსაცმელი", slug: "thermal-wear" },
        { id: "სათვალე", label: "სათვალე", slug: "goggles" },
        { id: "ჩაფხუტი", label: "ჩაფხუტი", slug: "helmet" },

        // კულტურული და თემატური
        { id: "ტრადიციული ტანსაცმელი", label: "ტრადიციული ტანსაცმელი", slug: "traditional" },
        { id: "ქოსფლეის კოსტუმები", label: "ქოსფლეის კოსტუმები", slug: "cosplay" },

        // მამაკაცების
        { id: "შარვალ კოსტუმი", label: "შარვალ კოსტუმი", slug: "suit" },
        { id: "პიჯაკი", label: "პიჯაკი", slug: "blazer" },

        // აქსესუარები
        { id: "აქსესუარები", label: "აქსესუარები", slug: "accessories" },

        // ბავშვები
        { id: "ბავშვთა კაბები", label: "ბავშვთა კაბები", slug: "kids-dresses" },
        { id: "ბავშვთა ტრადიციული ტანსაცმელი", label: "ბავშვთა ტრადიციული ტანსაცმელი", slug: "kids-traditional" },
        { id: "ბავშვთა სათხილამურო ტანსაცმელი", label: "ბავშვთა სათხილამურო ტანსაცმელი", slug: "kids-ski" },
    ]

    const sizeSystems = [
        { id: "EU", label: "EU" },
        { id: "US", label: "US" },
        { id: "UK", label: "UK" },
        { id: "CN", label: "CN" }
    ]

    const colors = [
        { id: "black", label: "შავი", color: "#000000" },
        { id: "white", label: "თეთრი", color: "#FFFFFF" },
        { id: "red", label: "წითელი", color: "#FF0000" },
        { id: "blue", label: "ლურჯი", color: "#0000FF" },
        { id: "green", label: "მწვანე", color: "#008000" },
        { id: "yellow", label: "ყვითელი", color: "#FFFF00" },
        { id: "pink", label: "ვარდისფერი", color: "#FFC0CB" },
        { id: "purple", label: "იისფერი", color: "#800080" },
        { id: "gray", label: "ნაცრისფერი", color: "#A52A2A" },
        { id: "beige", label: "ბეჟი", color: "#8B4513" }
    ]

    const locations = [
        { id: "თბილისი", label: "თბილისი" },
        { id: "ქუთაისი", label: "ქუთაისი" },
        { id: "რუსთავი", label: "რუსთავი" },
        { id: "ბათუმი", label: "ბათუმი" }
    ]

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
            try {
                // Build query parameters
                const params = new URLSearchParams()
                if (genderParam) {
                    params.append('gender', genderParam)
                }
                if (searchParam) {
                    params.append('search', searchParam)
                }
                if (purposeParam) {
                    params.append('purpose', purposeParam)
                }

                const response = await fetch(`/api/products?${params.toString()}`)
                const data = await response.json()
                if (data.success) {
                    setProducts(data.products)

                    // Calculate maximum price from products (including rental prices)
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
                }
            } catch (error) {
                console.error('Error fetching products:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [genderParam, searchParam, purposeParam])

    // Fetch rental status for rentable products (batched)
    useEffect(() => {
        const fetchRentalStatus = async () => {
            const rentableProducts = products.filter(p => p.isRentable)

            if (rentableProducts.length === 0) return

            // Batch fetch rental status for all products at once
            try {
                const productIds = rentableProducts.map(p => p.id).join(',')
                const response = await fetch(`/api/products/rental-status?ids=${productIds}`)
                const data = await response.json()

                if (data.success && data.statuses) {
                    setProductRentalStatus(data.statuses)
                } else {
                    // Fallback to individual requests if batch endpoint doesn't exist
                    for (const product of rentableProducts) {
                        try {
                            const response = await fetch(`/api/products/${product.id}/rental-status`)
                            const data = await response.json()
                            if (data.success) {
                                setProductRentalStatus(prev => ({
                                    ...prev,
                                    [product.id]: data.variants
                                }))
                            }
                        } catch (error) {
                            console.error(`Error fetching rental status for product ${product.id}:`, error)
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching batch rental status:', error)
                // Fallback to individual requests
                for (const product of rentableProducts) {
                    try {
                        const response = await fetch(`/api/products/${product.id}/rental-status`)
                        const data = await response.json()
                        if (data.success) {
                            setProductRentalStatus(prev => ({
                                ...prev,
                                [product.id]: data.variants
                            }))
                        }
                    } catch (err) {
                        console.error(`Error fetching rental status for product ${product.id}:`, err)
                    }
                }
            }
        }

        if (products.length > 0) {
            fetchRentalStatus()
        }
    }, [products])

    // Get minimum price from variants, or rental price if buy price is 0
    const getMinPrice = (product: Product) => {
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

    // Get maximum price from variants, or rental price if buy price is 0
    const getMaxPrice = (product: Product) => {
        // First check if product has variants with prices
        if (product.variants && product.variants.length > 0) {
            const prices = product.variants.map(v => v.price).filter(p => p > 0)
            // If all prices are 0 or no positive prices, check rental
            if (prices.length === 0) {
                return getRentalPrice(product)
            }
            const maxBuyPrice = Math.max(...prices)
            // If max buy price is 0, show rental price instead
            if (maxBuyPrice === 0) {
                const rentalPrice = getRentalPrice(product)
                return rentalPrice > 0 ? rentalPrice : 0
            }
            return maxBuyPrice
        }
        // If no variants, check if it's rentable
        return getRentalPrice(product)
    }

    // Check if product has rental parameters (is rentable)
    const hasRentalParameters = (product: Product): boolean => {
        // Must be explicitly rentable and have valid rental price tiers
        if (product.isRentable !== true) return false
        if (!product.rentalPriceTiers || product.rentalPriceTiers.length === 0) return false
        // Check if there's at least one tier with valid price
        return product.rentalPriceTiers.some(tier => tier && tier.pricePerDay > 0)
    }

    // Check if product has sale parameters (can be bought)
    const hasSaleParameters = (product: Product): boolean => {
        // Check if product has variants with prices > 0
        if (product.variants && product.variants.length > 0) {
            return product.variants.some(v => v && v.price > 0)
        }
        return false
    }

    // Check if product is rent-only (has rental parameters but no sale parameters)
    const isRentOnly = (product: Product): boolean => {
        // Must have rental parameters
        if (!hasRentalParameters(product)) return false
        // Must NOT have sale parameters
        return !hasSaleParameters(product)
    }

    // Check if product is sale-only (has sale parameters but no rental parameters)
    const isSaleOnly = (product: Product): boolean => {
        // Must have sale parameters
        if (!hasSaleParameters(product)) return false
        // Must NOT have rental parameters
        return !hasRentalParameters(product)
    }

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

    // Helper function to filter products by all criteria except purchase type (for count calculations)
    const getProductsFilteredByOtherCriteria = (productsToFilter: Product[]) => {
        return productsToFilter.filter(product => {
            // Category filter (multiple selection)
            const categoryMatch = selectedCategories.length === 0 ||
                selectedCategories.includes(product.category?.name || '')

            // Purpose filter
            const purposeMatch = selectedPurposes.length === 0 ||
                selectedPurposes.includes(product.purpose?.slug || '') ||
                selectedPurposes.includes(product.purpose?.name || '')

            // Price filter
            const minPrice = getMinPrice(product)
            const maxPrice = getMaxPrice(product)
            // If priceRange is not initialized (both are 0), show all products
            const priceMatch = (priceRange[0] === 0 && priceRange[1] === 0) ||
                (minPrice >= priceRange[0] && minPrice <= priceRange[1]) ||
                (maxPrice >= priceRange[0] && maxPrice <= priceRange[1]) ||
                (minPrice <= priceRange[0] && maxPrice >= priceRange[1])

            // Size System filter (variants no longer have sizeSystem, use product sizeSystem)
            const sizeSystemMatch = selectedSizeSystems.length === 0 ||
                (product.sizeSystem && selectedSizeSystems.includes(product.sizeSystem)) ||
                !product.sizeSystem

            // Color filter
            const colorMatch = selectedColors.length === 0 ||
                selectedColors.some(selectedColor => {
                    const colorMapping: Record<string, string[]> = {
                        'black': ['შავი', 'black'],
                        'white': ['თეთრი', 'white'],
                        'red': ['წითელი', 'red'],
                        'blue': ['ლურჯი', 'blue'],
                        'green': ['მწვანე', 'green'],
                        'yellow': ['ყვითელი', 'yellow'],
                        'pink': ['ვარდისფერი', 'pink'],
                        'purple': ['იისფერი', 'purple']
                    };

                    const colorVariations = colorMapping[selectedColor] || [selectedColor];
                    return colorVariations.some(color =>
                        product.color?.toLowerCase().includes(color.toLowerCase())
                    );
                })

            // Location filter
            const locationMatch = selectedLocations.length === 0 ||
                selectedLocations.includes(product.location || '')

            // Rental availability filter
            const rentalAvailabilityMatch = isProductAvailable(product)

            return categoryMatch && purposeMatch && priceMatch && sizeSystemMatch && colorMatch && locationMatch && rentalAvailabilityMatch
        })
    }

    // Get products filtered by all other criteria (excluding purchase type) for count calculations
    const productsForTypeCounts = getProductsFilteredByOtherCriteria(products)

    // Filter products by all criteria (excluding gender since it's handled by API)
    const filteredProducts = products.filter(product => {
        // Category filter (multiple selection)
        const categoryMatch = selectedCategories.length === 0 ||
            selectedCategories.includes(product.category?.name || '')

        // Purpose filter
        const purposeMatch = selectedPurposes.length === 0 ||
            selectedPurposes.includes(product.purpose?.slug || '') ||
            selectedPurposes.includes(product.purpose?.name || '')

        // Price filter
        const minPrice = getMinPrice(product)
        const maxPrice = getMaxPrice(product)
        // If priceRange is not initialized (both are 0), show all products
        const priceMatch = (priceRange[0] === 0 && priceRange[1] === 0) ||
            (minPrice >= priceRange[0] && minPrice <= priceRange[1]) ||
            (maxPrice >= priceRange[0] && maxPrice <= priceRange[1]) ||
            (minPrice <= priceRange[0] && maxPrice >= priceRange[1])

        // Size System filter (variants no longer have sizeSystem, use product sizeSystem)
        const sizeSystemMatch = selectedSizeSystems.length === 0 ||
            (product.sizeSystem && selectedSizeSystems.includes(product.sizeSystem)) ||
            !product.sizeSystem

        // Color filter
        const colorMatch = selectedColors.length === 0 ||
            selectedColors.some(selectedColor => {
                const colorMapping: Record<string, string[]> = {
                    'black': ['შავი', 'black'],
                    'white': ['თეთრი', 'white'],
                    'red': ['წითელი', 'red'],
                    'blue': ['ლურჯი', 'blue'],
                    'green': ['მწვანე', 'green'],
                    'yellow': ['ყვითელი', 'yellow'],
                    'pink': ['ვარდისფერი', 'pink'],
                    'purple': ['იისფერი', 'purple']
                };

                const colorVariations = colorMapping[selectedColor] || [selectedColor];
                return colorVariations.some(color =>
                    product.color?.toLowerCase().includes(color.toLowerCase())
                );
            })

        // Location filter
        const locationMatch = selectedLocations.length === 0 ||
            selectedLocations.includes(product.location || '')

        // Rental availability filter
        const rentalAvailabilityMatch = isProductAvailable(product)

        // Purchase type filter (rent-only, sale-only, or all)
        const purchaseTypeMatch = purchaseType === "all" ||
            (purchaseType === "rent-only" && isRentOnly(product)) ||
            (purchaseType === "sale-only" && isSaleOnly(product))

        return categoryMatch && purposeMatch && priceMatch && sizeSystemMatch && colorMatch && locationMatch && rentalAvailabilityMatch && purchaseTypeMatch
    })



    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return getMinPrice(a) - getMinPrice(b)
            case "price-high":
                return getMaxPrice(b) - getMaxPrice(a)
            case "rating":
                return (b.rating || 0) - (a.rating || 0)
            case "newest":
            default:
                return b.isNew ? 1 : -1
        }
    })

    // Pagination calculations
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentProducts = sortedProducts.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedCategories, selectedPurposes, priceRange, selectedSizeSystems, selectedColors, selectedLocations, rentalStartDate, rentalEndDate, sortBy, purchaseType])

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
        setSelectedColors([])
        setSelectedLocations([])
        setRentalStartDate(null)
        setRentalEndDate(null)
        setPurchaseType("all")
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

            {/* Category Section moved from Header */}
            <div className="bg-[#FAFAFA]">
                <div className="container  max-w-6xl mx-auto px-4 py-8 space-y-6 ">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="md:text-[24px] text-[20px] font-bold text-gray-900 text-start">
                            მოძებნეთ დანიშნულების მიხედვით
                        </h2>
                        {(searchParam || purposeParam) && (
                            <button
                                onClick={searchParam ? clearSearch : clearPurpose}
                                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-[15px] md:text-base"
                                aria-label={searchParam ? "ძიების გასუფთავება" : "დანიშნულების გასუფთავება"}
                            >
                                <X className="w-7 h-7" />
                                <span>{searchParam ? 'ძიების გასუფთავება' : 'დანიშნულების გასუფთავება'}</span>
                            </button>
                        )}
                        {/* Toggle button - only visible on mobile */}
                        <button
                            onClick={() => setIsCategorySectionOpen(!isCategorySectionOpen)}
                            className="md:hidden flex items-center gap-2 text-gray-700 hover:text-gray-900"
                            aria-label="კატეგორიების გახსნა/დახურვა"
                        >
                            <span className="text-[16px] font-medium">
                                {isCategorySectionOpen ? '' : ''}
                            </span>
                            <ChevronDown
                                className={`w-5 h-5 transition-transform ${isCategorySectionOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>
                    {/* Category grid - hidden on mobile by default, always visible on desktop */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isCategorySectionOpen ? 'block' : 'hidden md:grid'}`}>
                        {/* Category Box 1 */}
                        <Link
                            href="/shop?purpose=everyday"
                            className=" bg-white
    border border-gray-300
    w-[265px]
    h-[42px]
    rounded-full
    flex items-center justify-center
    hover:border-gray-400
    transition-colors
    cursor-pointer
  "
                        >
                            <p className="text-black text-[16px] font-normal">
                                ყოველდღიური ტანსაცმელი
                            </p>
                        </Link>


                        {/* Category Box 2 */}
                        <Link
                            href="/shop?purpose=wedding"
                            className="
    bg-white
    border border-gray-300
    w-[265px]
    h-[42px]
    rounded-full
    flex items-center justify-center

    transition-colors
    cursor-pointer
  "
                        >
                            <p className="text-black text-[16px]">
                                საქორწილო და სადღესასწაულო
                            </p>
                        </Link>

                        {/* Category Box 3 */}
                        <Link
                            href="/shop?purpose=sports"
                            className="
    bg-white
    border border-gray-300
    w-[265px]
    h-[42px]
    rounded-full
    flex items-center justify-center
   
    transition-colors
    cursor-pointer
  "
                        >
                            <p className="text-black text-[16px]">
                                სათხილამურო და სპორტული
                            </p>
                        </Link>

                        {/* Category Box 4 */}
                        <Link
                            href="/shop?purpose=cultural"
                            className="
    bg-white
    border border-gray-300
    w-[265px]
    h-[42px]
    rounded-full
    flex items-center justify-center
   
    transition-colors
    cursor-pointer
  "
                        >
                            <p className="text-black text-[16px]">
                                კულტურული და თემატური
                            </p>
                        </Link>

                    </div>
                </div>
            </div>

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
                                </div>
                            </div>

                            {/* Right Content Area - Filter Options */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {activeMobileFilter === 'size' && (
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
                                )}

                                {activeMobileFilter === 'color' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ფერი</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {colors.map((color) => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => toggleColor(color.id)}
                                                    className={`relative w-12 h-12 rounded-full border-2 transition-all ${selectedColors.includes(color.id)
                                                        ? 'border-[#1B3729] ring-2 ring-[#1B3729] ring-offset-2'
                                                        : 'border-gray-300'
                                                        }`}
                                                    style={{ backgroundColor: color.color }}
                                                    title={color.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeMobileFilter === 'category' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">კატეგორია</h3>
                                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                            {categories.map((category) => {
                                                const categoryCount = products.filter(product =>
                                                    product.category?.name === category.label
                                                ).length;
                                                const isSelected = selectedCategories.includes(category.label);

                                                return (
                                                    <label
                                                        key={category.id}
                                                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleCategory(category.label)}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-[16px] text-black">{category.label}</span>
                                                        </span>
                                                        <span className="text-sm text-gray-500">{categoryCount}</span>
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

                                {activeMobileFilter === 'type' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-black mb-4">ტიპი</h3>
                                        {[
                                            { value: "all", label: "ყველა", count: productsForTypeCounts.length },
                                            { value: "rent-only", label: "მხოლოდ გაქირავება", count: productsForTypeCounts.filter(p => isRentOnly(p)).length },
                                            { value: "sale-only", label: "მხოლოდ ყიდვა", count: productsForTypeCounts.filter(p => isSaleOnly(p)).length },
                                        ].map(({ value, label, count }) => {
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
                                                            onChange={() => setPurchaseType(value as "all" | "rent-only" | "sale-only")}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-[16px]">{label}</span>
                                                    </span>
                                                    <span className={`text-[16px] ${active ? 'text-white' : 'text-gray-600'}`}>{count}</span>
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
                                ჩვენება {filteredProducts.length}+ შედეგი
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

                            {/* Type */}
                            <div className="border-b border-gray-200 pb-6">
                                <h4 className="font-medium text-black md:text-[18px] text-[16px] mb-3">ტიპი</h4>
                                <div className="space-y-2 text-[15px] text-black">
                                    {[
                                        { value: "all", label: "ყველა", count: productsForTypeCounts.length },
                                        { value: "rent-only", label: "მხოლოდ გაქირავება", count: productsForTypeCounts.filter(p => isRentOnly(p)).length },
                                        { value: "sale-only", label: "მხოლოდ ყიდვა", count: productsForTypeCounts.filter(p => isSaleOnly(p)).length },
                                    ].map(({ value, label, count }) => {
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
                                                        onChange={() => setPurchaseType(value as "all" | "rent-only" | "sale-only")}
                                                        className="w-4 h-4 accent-black"
                                                    />
                                                    {label}
                                                </span>
                                                <span className={`text-[16px] ${active ? 'text-black font-medium' : 'text-gray-600'}`}>{count}</span>
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
                                        const purposeCount = products.filter(product =>
                                            product.purpose?.slug === purpose.slug
                                        ).length
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
                                                <span className="text-xs text-gray-500">{purposeCount}</span>
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
                                        {categories.map((category) => {
                                            const categoryCount = products.filter(product =>
                                                product.category?.name === category.label
                                            ).length;
                                            const isSelected = selectedCategories.includes(category.label);

                                            return (
                                                <label
                                                    key={category.id}
                                                    className="flex items-center justify-between text-[15px] text-black cursor-pointer py-1"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleCategory(category.label)}
                                                            className="w-4 h-4"
                                                        />
                                                        {category.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{categoryCount}</span>
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
                                <div className="flex flex-wrap gap-3">
                                    {colors.map((color) => (
                                        <button
                                            key={color.id}
                                            onClick={() => toggleColor(color.id)}
                                            className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 ${selectedColors.includes(color.id)
                                                ? 'border-[#1B3729] ring-2 ring-[#1B3729] ring-offset-2'
                                                : 'border-gray-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2'
                                                }`}
                                            style={{ backgroundColor: color.color }}
                                        >

                                        </button>
                                    ))}
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
                                            <div className="relative  w-full  h-[273px] bg-gray-100  overflow-hidden">
                                                <Image
                                                    src={product.images?.[0]?.url || "/placeholder.jpg"}
                                                    alt={product.name}
                                                    fill

                                                    className="object-cover transition-transform duration-300 "
                                                    loading={index < 4 ? "eager" : "lazy"}
                                                    priority={index < 4}

                                                />


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
                                                {product.discount && product.discount > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-regular text-black md:text-[18px] text-[16px]">
                                                            ₾{(() => {
                                                                const originalPrice = getDisplayPrice(product)
                                                                const discountedPrice = originalPrice - (product.discount || 0)
                                                                return Math.max(0, discountedPrice).toFixed(2)
                                                            })()}
                                                        </span>
                                                        <span className="font-regular text-black md:text-[18px] text-[16px] line-through decoration-black" style={{ textDecorationThickness: '1px' }}>
                                                            ₾{getDisplayPrice(product).toFixed(2)}
                                                        </span>

                                                    </div>
                                                ) : (
                                                    <span className="font-regular text-black md:text-[18px] text-[16px]">
                                                        ₾{getDisplayPrice(product).toFixed(2)}
                                                    </span>
                                                )}
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
                        {totalPages > 1 && (
                            <div className="flex flex-col items-center justify-center gap-4 mt-8">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${currentPage === 1
                                            ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                            : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                            }`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        წინა
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                            // Show first page, last page, current page, and pages around current
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] ${currentPage === page
                                                            ? 'bg-black text-white border-black'
                                                            : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return (
                                                    <span key={page} className="px-2 text-black">
                                                        ...
                                                    </span>
                                                )
                                            }
                                            return null
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${currentPage === totalPages
                                            ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                            : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                            }`}
                                    >
                                        შემდეგი
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-black md:text-[16px] text-[14px]">
                                    გვერდი {currentPage} {totalPages}-დან
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopPageClient
