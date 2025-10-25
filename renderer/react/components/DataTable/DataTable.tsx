/**
 * DataTable component - renders tabular data from RenderTree
 *
 * Pure presentation component with no logic. Receives processed data from
 * the core renderer and displays it using shadcn/ui Table components.
 */

import type {ReactElement} from 'react';
import {memo, useId} from 'react';

import type {Column, TableProps} from '@sigil/renderer/core';
import {cn} from '@sigil/src/common/utils/cn';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@sigil/src/ui/primitives/table';


/**
 * Maps column alignment to Tailwind CSS classes
 */
const getAlignmentClass = (alignment?: Column['alignment']): string => {
	switch (alignment) {
		case 'center':
			return 'text-center';
		case 'right':
			return 'text-right';
		case 'left':
		default:
			return 'text-left';
	}
};

/**
 * DataTable component (internal)
 *
 * Renders a simple table with headers and rows. All data processing
 * (value mappings, type coercion, etc.) is already complete in TableProps.
 *
 * @param props - Table configuration from RenderTree
 * @returns Rendered table element
 */
const DataTableComponent = (props: TableProps): ReactElement => {
	const {title, description, columns, data} = props;

	// Generate stable IDs for ARIA associations
	const descriptionId = useId();

	return (
		<div className="space-y-4">
			{description && (
				<p id={descriptionId} className="text-sm text-muted-foreground">
					{description}
				</p>
			)}

			<div className="rounded-md border">
				<Table aria-describedby={description ? descriptionId : undefined}>
					{title && <TableCaption className="caption-top mb-2 text-2xl font-semibold tracking-tight text-foreground">{title}</TableCaption>}
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead key={column.id} scope="col" className={cn(getAlignmentClass(column.alignment))}>
									{column.label}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center" role="status">
                  No results
								</TableCell>
							</TableRow>
						) : (
							data.map((row) => (
								<TableRow key={row.id}>
									{columns.map((column) => {
										const cell = row.cells[column.id];
										return (
											<TableCell key={column.id} className={cn(getAlignmentClass(column.alignment))}>
												{cell?.display ?? ''}
											</TableCell>
										);
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

/**
 * DataTable component
 *
 * Memoised to prevent unnecessary re-renders when parent components update.
 */
export const DataTable = memo(DataTableComponent);
DataTable.displayName = 'DataTable';
