const ABOUT_ROWS = [
  ['Version', 'v1.0.0'],
  ['Backend', window.location.origin],
  ['Stack', 'React 19 · FastAPI · SQLite'],
]

const AboutPanel = () => (
  <div className="panel rounded-2xl p-6">
    <h2 className="text-t1 text-sm font-semibold mb-4">About</h2>
    <dl className="space-y-3">
      {ABOUT_ROWS.map(([label, value]) => (
        <div key={label} className="flex items-center">
          <dt className="font-mono text-[11px] text-t3 w-24">{label}</dt>
          <dd className="font-mono text-[11px] text-t1">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
)

export default AboutPanel
