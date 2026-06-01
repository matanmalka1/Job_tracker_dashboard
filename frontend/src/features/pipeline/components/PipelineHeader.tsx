const PipelineHeader = ({ total }: { total?: number }) => (
  <div>
    <h1 className="text-white text-2xl font-bold">Pipeline Board</h1>
    <p className="text-gray-400 text-sm mt-1">
      {total != null ? `${total} application${total !== 1 ? 's' : ''}` : 'Loading...'}
    </p>
  </div>
)

export default PipelineHeader
