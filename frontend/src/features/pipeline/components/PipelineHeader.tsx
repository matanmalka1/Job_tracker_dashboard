import { Layers } from 'lucide-react'

const PipelineHeader = ({ total }: { total?: number }) => (
  <div className="pipeline-header">
    <div className="pipeline-header__left">
      <div className="pipeline-header__icon">
        <Layers size={16} />
      </div>
      <div>
        <h1 className="pipeline-header__title">Pipeline</h1>
        <p className="pipeline-header__sub">
          {total != null
            ? `${total} application${total !== 1 ? 's' : ''} in flight`
            : 'Loading…'}
        </p>
      </div>
    </div>
  </div>
)

export default PipelineHeader
