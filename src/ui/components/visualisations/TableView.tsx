import {querySingleValue} from '@sigil/renderer/core/utils/queryJSONPath';
import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr} from '@sigil/src/common/errors/result';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sigil/src/ui/primitives/table';

interface KeyField {
  path: string;
  label: string;
}

interface TableViewProps {
  data: unknown[];
  keyFields: KeyField[];
}

export const TableView = ({data, keyFields}: TableViewProps) => {
  // Limit to first 100 rows for performance
  const displayData = data.slice(0, 100);

  // Get actual column names from the data structure
  // For CSV with headers like "A", "B", "C", field.path IS the column name
  // For nested objects, field.path is the accessor path
  const getHeaderName = (field: KeyField) => {
    // If the path is a simple key (no dots/brackets), it's likely the actual column name
    if (!field.path.includes('.') && !field.path.includes('[')) {
      return field.path;
    }
    // For nested paths, use the label
    return field.label;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {keyFields.map((field) => (
              <TableHead key={field.path}>{getHeaderName(field)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((item, idx) => (
            <TableRow key={idx}>
              {keyFields.map((field) => {
                const result = querySingleValue(item, field.path);

                // Handle errors gracefully - show error indicator in cell
                if (isErr(result)) {
                  const isArrayError = result.error.at(0)?.code === ERROR_CODES.EXPECTED_SINGLE_VALUE;
                  return (
                    <TableCell key={field.path} className="text-red-500">
                      {isArrayError ? '[Array]' : '[Error]'}
                    </TableCell>
                  );
                }

                const value = result.data;
                return (
                  <TableCell key={field.path}>
                    {value !== undefined && value !== null ? String(value) : '-'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
