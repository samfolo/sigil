- I think the accessors for generated specs for tabular data where the data is an array of objects should still include the wildcard for column-oriented accessors. If you have a data array like this:

```json
[
  {"name": "Alice", "age": 30},
  {"name": "Bob", "age": 25}
]
```

Then an accessor like `$[*].name` should still be valid to extract the "name" column across all rows. The wildcard indicates that we want to pull that property from each object in the array.

For array-of-arrays data, the accessors would be positional like `$[0][1]` to get the second element of the first row.

There isn't any situation I can think of where it might be necessary to display an object of data as a table, except maybe if the object is a mapping of keys to objects and you want to show the keys as one column and some property of the nested objects as another column. Would JSONPath support that use case with something like `$[*].propertyName` to get all the propertyName values from the nested objects?
