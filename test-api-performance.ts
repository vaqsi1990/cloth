import axios from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'
const ENDPOINT = '/api/products'

interface TestResult {
  attempt: number
  duration: number
  status: number
  productCount: number
  timestamp: string
}

async function testApiPerformance(iterations: number = 5) {
  console.log('🚀 API Performance Test')
  console.log('='.repeat(50))
  console.log(`Testing: ${API_URL}${ENDPOINT}`)
  console.log(`Iterations: ${iterations}`)
  console.log('='.repeat(50))
  console.log()

  const results: TestResult[] = []

  for (let i = 1; i <= iterations; i++) {
    const startTime = performance.now()
    
    try {
      const response = await axios.get(`${API_URL}${ENDPOINT}`, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      const result: TestResult = {
        attempt: i,
        duration: Math.round(duration),
        status: response.status,
        productCount: response.data?.products?.length || 0,
        timestamp: new Date().toISOString(),
      }

      results.push(result)

      console.log(`✅ Attempt ${i}: ${result.duration}ms | Status: ${result.status} | Products: ${result.productCount}`)
    } catch (error: any) {
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`❌ Attempt ${i}: ${Math.round(duration)}ms | Error: ${error.message}`)
      
      results.push({
        attempt: i,
        duration: Math.round(duration),
        status: error.response?.status || 0,
        productCount: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Small delay between requests
    if (i < iterations) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Calculate statistics
  const successfulResults = results.filter(r => r.status === 200)
  
  if (successfulResults.length > 0) {
    const durations = successfulResults.map(r => r.duration)
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    const medianDuration = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]

    console.log()
    console.log('='.repeat(50))
    console.log('📊 Statistics')
    console.log('='.repeat(50))
    console.log(`Successful requests: ${successfulResults.length}/${iterations}`)
    console.log(`Average duration: ${avgDuration}ms`)
    console.log(`Min duration: ${minDuration}ms`)
    console.log(`Max duration: ${maxDuration}ms`)
    console.log(`Median duration: ${medianDuration}ms`)
    console.log('='.repeat(50))

    // Performance rating
    let rating = '🟢 Excellent'
    if (avgDuration > 2000) rating = '🔴 Slow'
    else if (avgDuration > 1000) rating = '🟡 Moderate'
    else if (avgDuration > 500) rating = '🟠 Good'

    console.log(`Performance: ${rating} (${avgDuration}ms average)`)
  } else {
    console.log()
    console.log('❌ All requests failed!')
  }

  return results
}

// Run the test
const iterations = process.argv[2] ? parseInt(process.argv[2]) : 5

testApiPerformance(iterations)
  .then(() => {
    console.log()
    console.log('✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

