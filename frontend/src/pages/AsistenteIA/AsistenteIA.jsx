import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import api from '../../services/api.js'

const SUGGESTIONS = [
  { icon: '📊', text: '¿Cuál es el resumen financiero del mes?' },
  { icon: '🏆', text: '¿Qué franquicia tiene más ventas este mes?' },
  { icon: '🛵', text: '¿Qué plataforma de delivery genera más ingresos?' },
  { icon: '👥', text: '¿Cuánto es la masa salarial mensual total?' },
  { icon: '🧾', text: '¿Hay facturas pendientes de cobro o vencidas?' },
  { icon: '💡', text: 'Dame recomendaciones para mejorar el ticket medio' },
  { icon: '📈', text: '¿Cómo van las ventas comparado con el mes anterior?' },
  { icon: '⚠️',  text: '¿Qué puntos de atención hay en el negocio?' },
]

const MarkdownText = ({ text }) => {
  // Simple markdown renderer for bold, lists, headers
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return (
          <div key={i} style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold)', marginTop: 12, marginBottom: 4 }}>
            {line.replace('### ', '')}
          </div>
        )
        if (line.startsWith('## ')) return (
          <div key={i} style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginTop: 14, marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
            {line.replace('## ', '')}
          </div>
        )
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <span style={{ color: 'var(--gold)', flexShrink: 0 }}>•</span>
            <span>{renderInline(line.replace(/^[-•] /, ''))}</span>
          </div>
        )
        if (line.match(/^\d+\. /)) return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <span style={{ color: 'var(--gold)', flexShrink: 0, minWidth: 20 }}>{line.match(/^\d+/)[0]}.</span>
            <span>{renderInline(line.replace(/^\d+\. /, ''))}</span>
          </div>
        )
        if (line === '') return <div key={i} style={{ height: 6 }} />
        return <div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>
      })}
    </div>
  )
}

const renderInline = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text)' }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

const AsistenteIA = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `¡Hola${user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}! 👋\n\nSoy el asistente IA de **Kebab Lab ERP**. Tengo acceso en tiempo real a los datos de tus franquicias: ventas, empleados, delivery, facturación y más.\n\n¿En qué puedo ayudarte hoy?`,
      ts: new Date(),
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showSugg, setShowSugg] = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setShowSugg(false)

    const userMsg = { role: 'user', content: msg, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await api.post('/ia/chat', { messages: history })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.content,
        ts: new Date(),
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error al conectar con la IA. Verifica que el servidor está funcionando.',
        ts: new Date(),
        error: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const fmt = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat reiniciado. ¿En qué puedo ayudarte?`,
      ts: new Date(),
    }])
    setShowSugg(true)
  }

  return (
    <div className="page-content" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--bg3)',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold), #e3762a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>Asistente IA — Kebab Lab</div>
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 6px var(--green)' }}/>
              <span style={{ color: 'var(--green)' }}>Conectado · Claude API · Datos en tiempo real</span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={clearChat}
            title="Limpiar chat"
          >🗑️ Limpiar</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              gap: 10, alignItems: 'flex-start',
            }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, var(--gold), #e3762a)'
                  : 'linear-gradient(135deg, #bc8cff, #58a6ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#000',
              }}>
                {m.role === 'user'
                  ? (user?.nombre?.[0] || 'U')
                  : '🤖'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, rgba(229,188,85,.15), rgba(229,188,85,.08))'
                  : m.error ? 'rgba(248,81,73,.1)' : 'var(--bg3)',
                border: `1px solid ${m.role === 'user'
                  ? 'rgba(229,188,85,.3)'
                  : m.error ? 'rgba(248,81,73,.3)' : 'var(--border)'}`,
                borderRadius: m.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                padding: '12px 16px',
              }}>
                {m.role === 'assistant'
                  ? <MarkdownText text={m.content} />
                  : <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.content}</div>
                }
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>
                  {fmt(m.ts)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #bc8cff, #58a6ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🤖</div>
              <div style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '2px 12px 12px 12px', padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)',
                      animation: `bounce 1.2s infinite ${i * 0.2}s`,
                    }}/>
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>
                    Consultando datos del ERP...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {showSugg && messages.length <= 1 && (
          <div style={{
            padding: '0 20px 12px',
            display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0,
          }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                disabled={loading}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '6px 12px', fontSize: 12,
                  color: 'var(--text2)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 5, transition: 'all .15s',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text2)' }}
              >
                {s.icon} {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0, background: 'var(--bg3)',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Pregunta sobre ventas, empleados, delivery, facturas..."
            disabled={loading}
            style={{
              flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px', color: 'var(--text)',
              fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'var(--bg4)' : 'var(--gold)',
              color: loading || !input.trim() ? 'var(--text3)' : '#000',
              border: 'none', borderRadius: 8, width: 42, height: 42,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 16, transition: 'all .15s', flexShrink: 0,
            }}
          >➤</button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export default AsistenteIA
