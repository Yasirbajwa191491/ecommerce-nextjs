export async function exactBoundedRead<T>(query: { take: (n: number) => Promise<T[]> }, limit = 2000): Promise<T[]> {
 const rows = await query.take(limit + 1);
 if (rows.length > limit) throw new Error("Detailed report exceeds the interactive limit; choose a narrower reporting range. No partial totals were returned.");
 return rows;
}
