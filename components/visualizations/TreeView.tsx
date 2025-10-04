interface TreeViewProps {
  data: any;
}

export const TreeView = ({ data }: TreeViewProps) => {
  return (
    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};
