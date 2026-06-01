const ABOUT_ROWS = [
  ['Version', 'v1.0.0'],
  ['Backend', window.location.origin],
  ['Stack', 'React 19 · FastAPI · SQLite'],
]

const AboutPanel = () => (
  <div className="rounded-2xl p-6" style={{ background: '#0e0e1a', border: '1px solid #ffffff08' }}>
    <h2 className="text-white text-sm font-semibold mb-4">About</h2>
    <dl className="space-y-3">
      {ABOUT_ROWS.map(([label, value]) => (
        <div key={label} className="flex items-center">
          <dt className="font-mono text-[11px] text-gray-600 w-24">{label}</dt>
          <dd className="font-mono text-[11px] text-gray-300">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
)

export default AboutPanel
