/**
 * DataTable component - renders tabular data from RenderTree
 *
 * Pure presentation component with no logic. Receives processed data from
 * the core renderer and displays it using shadcn/ui Table components.
 */

import type {ReactElement} from 'react';

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@sigil/components/ui/table';

import type {TableProps} from '../../core';

/**
 * DataTable component
 *
 * Renders a simple table with headers and rows. All data processing
 * (value mappings, type coercion, etc.) is already complete in TableProps.
 *
 * @param props - Table configuration from RenderTree
 * @returns Rendered table element
 */
export const DataTable = (props: TableProps): ReactElement => {
	const {title, description, columns, data} = props;

	return (
		<div className="space-y-4">
			{(title || description) && (
				<div className="space-y-1">
					{title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}
					{description && <p className="text-sm text-muted-foreground">{description}</p>}
				</div>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead key={column.id}>{column.label}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									No results
								</TableCell>
							</TableRow>
						) : (
							data.map((row) => (
								<TableRow key={row.id}>
									{columns.map((column) => {
										const cell = row.cells[column.id];
										return <TableCell key={column.id}>{cell?.display ?? ''}</TableCell>;
									})}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};
