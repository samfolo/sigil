interface TreeViewProps {
  data: unknown;
}

export const TreeView = ({data}: TreeViewProps) => (
  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
    {JSON.stringify(data, null, 2)}
  </pre>
);
