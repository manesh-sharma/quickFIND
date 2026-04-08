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
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
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
      <div style={{ width: '650px', position: 'relative' }}>

        {/* 🔍 SEARCH BAR */}
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px', opacity: 0.4, flexShrink: 0 }}>🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files & folders..."
            style={{
              flex: 1,
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
                  padding: '10px 16px',
                  background: i === selectedIndex ? '#2a2a2a' : 'transparent',
                  transition: '0.15s',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {/* 📁 folder / 📄 file icon */}
                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                  {file.type === 'folder' ? '📁' : '📄'}
                </span>

                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '15px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {file.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#888',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {file.path}
                  </div>
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