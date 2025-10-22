// Format date for display in Georgian
export const formatDate = (date: Date | string) => {
    if (!date) return ''
    const d = new Date(date)
    
    const months = [
        'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
        'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
    ]
    
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    
    return `${day} ${month} ${year}`
}

// Format date with time
export const formatDateTime = (date: Date | string) => {
    if (!date) return ''
    const d = new Date(date)
    
    const months = [
        'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
        'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
    ]
    
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${day} ${month} ${year}, ${hours}:${minutes}`
}
