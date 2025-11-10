"use client"

import React, { useMemo, useState } from "react"
import styles from "./AnimatedDotsLoader.module.css"

const AnimatedDotsLoader = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLinearMotion, setIsLinearMotion] = useState(false)

  const svgClasses = useMemo(() => {
    return [
      styles.svg,
      isDarkMode ? styles.svgDark : styles.svgLight,
      isLinearMotion ? styles.svgLinear : styles.svgCircular,
    ].join(" ")
  }, [isDarkMode, isLinearMotion])

  const dot4Classes = useMemo(() => {
    const base = [styles.shape, styles.dot4]
    if (isDarkMode) {
      base.push(styles.darkDot4)
    }
    if (isLinearMotion) {
      base.push(styles.linearDot4)
    }
    return base.join(" ")
  }, [isDarkMode, isLinearMotion])

  const dot1Classes = useMemo(() => {
    const base = [styles.shape, styles.dot1]
    if (isLinearMotion) {
      base.push(styles.linearDot1)
    }
    return base.join(" ")
  }, [isLinearMotion])

  const dot2Classes = useMemo(() => {
    const base = [styles.shape, styles.dot2]
    if (isLinearMotion) {
      base.push(styles.linearDot2)
    }
    return base.join(" ")
  }, [isLinearMotion])

  const dot3Classes = useMemo(() => {
    const base = [styles.shape, styles.dot3]
    if (isLinearMotion) {
      base.push(styles.linearDot3)
    }
    return base.join(" ")
  }, [isLinearMotion])



  return (
    <div className={styles.wrapper}>
      <svg className={svgClasses} viewBox="0 0 200 200">
        <circle className={dot1Classes} />
        <circle className={dot2Classes} />
        <circle className={dot3Classes} />
        <circle className={dot4Classes} />
      </svg>

     
    </div>
  )
}

export default AnimatedDotsLoader

