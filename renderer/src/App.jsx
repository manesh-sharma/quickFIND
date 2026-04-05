import { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 🔍 Auto search (debounce)
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (query.trim() === '') {
        setResults([]);
        return;
      }

      const res = await window.electronAPI.searchFiles(query);
      setResults(res);
      setSelectedIndex(0);
    }, 200);

    return () => clearTimeout(delay);
  }, [query]);

  // ⌨️ Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }

      if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          window.electronAPI.openFile(results[selectedIndex].path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex]);

  return (
    <div
      style={{
        background: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 🔥 WRAPPER (IMPORTANT: relative for dropdown) */}
      <div
        style={{
          width: '650px',
          position: 'relative',
        }}
      >
        {/* 🔍 SEARCH BAR */}
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            padding: '16px',
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: '#fff',
              fontSize: '18px',
            }}
          />
        </div>

        {/* 📂 FLOATING RESULTS */}
        {results.length > 0 && (
  <div
    style={{
      marginTop: '8px',
      background: '#1a1a1a',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      maxHeight: '300px',
      overflowY: results.length > 6 ? 'auto' : 'hidden',
    }}
  >
    {results.slice(0, 20).map((file, i) => (
      <div
        key={i}
        onMouseEnter={() => setSelectedIndex(i)}
        onClick={() => window.electronAPI.openFile(file.path)}
        style={{
          padding: '12px 16px',
          background:
            i === selectedIndex ? '#2a2a2a' : 'transparent',
          transition: '0.15s',
          cursor: 'pointer',
        }}
      >
        <div style={{ color: '#fff', fontSize: '15px' }}>
          {file.name}
        </div>

        <div style={{ fontSize: '12px', color: '#888' }}>
          {file.path}
        </div>
      </div>
    ))}
  </div>
)}
      </div>
    </div>
  );
}

export default App;