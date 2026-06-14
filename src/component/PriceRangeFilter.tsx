"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'

type PriceRangeFilterProps = {
    priceRange: [number, number]
    maxPrice: number
    onChange: (range: [number, number]) => void
}

function clampRange(min: number, max: number, ceiling: number): [number, number] {
    const safeCeiling = Math.max(ceiling, 1)
    const nextMin = Math.max(0, Math.min(min, safeCeiling))
    const nextMax = Math.max(nextMin, Math.min(max, safeCeiling))
    return [nextMin, nextMax]
}

function formatInputValue(value: number): string {
    return value === 0 ? '' : String(value)
}

function parseInputValue(raw: string): number | null {
    if (raw === '') return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

function toPercent(value: number, maxPrice: number): number {
    if (maxPrice <= 0) return 0
    return (value / maxPrice) * 100
}

export default function PriceRangeFilter({
    priceRange,
    maxPrice,
    onChange,
}: PriceRangeFilterProps) {
    const trackRef = useRef<HTMLDivElement>(null)
    const sliderRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef<'min' | 'max' | null>(null)
    const [localRange, setLocalRange] = useState<[number, number]>(priceRange)

    useEffect(() => {
        if (draggingRef.current === null) {
            setLocalRange(clampRange(priceRange[0], priceRange[1], maxPrice))
        }
    }, [priceRange, maxPrice])

    const [minValue, maxValue] = localRange

    const commitRange = useCallback(
        (nextMin: number, nextMax: number) => {
            const next = clampRange(nextMin, nextMax, maxPrice)
            setLocalRange(next)
            onChange(next)
        },
        [maxPrice, onChange],
    )

    const valueFromClientX = useCallback(
        (clientX: number) => {
            const track = trackRef.current
            if (!track || maxPrice <= 0) return 0
            const rect = track.getBoundingClientRect()
            if (rect.width <= 0) return 0
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
            return Math.round(ratio * maxPrice)
        },
        [maxPrice],
    )

    const handleMinInput = (raw: string) => {
        const parsed = parseInputValue(raw)
        if (parsed === null) return
        commitRange(Math.min(parsed, maxValue), maxValue)
    }

    const handleMaxInput = (raw: string) => {
        if (raw === '') {
            commitRange(minValue, maxPrice)
            return
        }
        const parsed = Number.parseInt(raw, 10)
        if (!Number.isFinite(parsed)) return
        commitRange(minValue, Math.max(parsed, minValue))
    }

    const handlePointerDown = (thumb: 'min' | 'max') => (event: React.PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        draggingRef.current = thumb
        sliderRef.current?.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const thumb = draggingRef.current
        if (!thumb) return

        const nextValue = valueFromClientX(event.clientX)
        setLocalRange((prev) => {
            if (thumb === 'min') {
                const nextMin = Math.min(nextValue, prev[1])
                return nextMin === prev[0] ? prev : [nextMin, prev[1]]
            }
            const nextMax = Math.max(nextValue, prev[0])
            return nextMax === prev[1] ? prev : [prev[0], nextMax]
        })
    }

    const handlePointerEnd = () => {
        if (!draggingRef.current) return
        draggingRef.current = null
        setLocalRange((prev) => {
            const next = clampRange(prev[0], prev[1], maxPrice)
            onChange(next)
            return next
        })
    }

    const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (maxPrice <= 0) return
        const clickValue = valueFromClientX(event.clientX)
        const distToMin = Math.abs(clickValue - minValue)
        const distToMax = Math.abs(clickValue - maxValue)
        const thumb: 'min' | 'max' = distToMin <= distToMax ? 'min' : 'max'
        draggingRef.current = thumb
        sliderRef.current?.setPointerCapture(event.pointerId)

        setLocalRange((prev) => {
            if (thumb === 'min') {
                const nextMin = Math.min(clickValue, prev[1])
                return [nextMin, prev[1]]
            }
            const nextMax = Math.max(clickValue, prev[0])
            return [prev[0], nextMax]
        })
    }

    const inputClassName =
        'w-1/2 px-3 py-2 border border-gray-300 rounded text-[14px] text-black focus:border-black focus:outline-none'

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    max={maxValue}
                    value={formatInputValue(minValue)}
                    placeholder="0"
                    onChange={(e) => handleMinInput(e.target.value)}
                    className={inputClassName}
                />
                <input
                    type="number"
                    min={minValue}
                    max={maxPrice}
                    value={formatInputValue(maxValue)}
                    placeholder={maxPrice > 0 ? String(maxPrice) : '0'}
                    onChange={(e) => handleMaxInput(e.target.value)}
                    className={inputClassName}
                />
            </div>

            {maxPrice > 0 && (
                <div
                    ref={sliderRef}
                    className="price-range-slider relative w-full py-3 touch-none select-none"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                >
                    <div className="relative mx-2 py-2">
                        <div
                            ref={trackRef}
                            className="relative h-2"
                            onPointerDown={handleTrackPointerDown}
                        >
                            <div className="absolute inset-0 rounded-lg bg-gray-200" />
                            <div
                                className="absolute inset-y-0 rounded-lg bg-black"
                                style={{
                                    left: `${toPercent(minValue, maxPrice)}%`,
                                    right: `${100 - toPercent(maxValue, maxPrice)}%`,
                                }}
                            />
                            <button
                                type="button"
                                aria-label="მინიმალური ფასი"
                                className="price-range-thumb absolute top-1/2 z-20"
                                style={{ left: `${toPercent(minValue, maxPrice)}%` }}
                                onPointerDown={handlePointerDown('min')}
                            />
                            <button
                                type="button"
                                aria-label="მაქსიმალური ფასი"
                                className="price-range-thumb absolute top-1/2 z-30"
                                style={{ left: `${toPercent(maxValue, maxPrice)}%` }}
                                onPointerDown={handlePointerDown('max')}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between md:text-[16px] text-[14px] text-black">
                <span>₾{minValue}</span>
                <span>₾{maxValue}</span>
            </div>
        </div>
    )
}
