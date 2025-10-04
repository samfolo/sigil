import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { get } from 'lodash';

interface KeyField {
  path: string;
  label: string;
}

interface TableViewProps {
  data: any[];
  keyFields: KeyField[];
}

export const TableView = ({ data, keyFields }: TableViewProps) => {
  // Limit to first 100 rows for performance
  const displayData = data.slice(0, 100);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {keyFields.map((field) => (
              <TableHead key={field.path}>{field.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((item, idx) => (
            <TableRow key={idx}>
              {keyFields.map((field) => {
                const value = get(item, field.path);
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
