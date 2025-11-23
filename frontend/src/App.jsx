import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
  fetch("http://127.0.0.1:8000/api/health")
    .then(res => res.json())
    .then(data => setHealth(data))
    .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Zen Ops</h1>
      <p>Frontend ↔ Backend connectivity check</p>
      {health && (
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '8px' }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}
    </div>
  )
}

export default App
