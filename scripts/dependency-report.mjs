// Informational advisory reporting is separate from required test/lint gates.
// Fail if the advisory service is unavailable or produces an invalid response.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const cwd = process.argv[2] ?? '.';
const result = spawnSync('npm', ['audit', '--json'], {cwd, encoding:'utf8'});
const report = JSON.parse(result.stdout);
if (result.error || report.error || !report.metadata?.vulnerabilities) throw new Error('Dependency advisory query failed');
fs.mkdirSync('.artifacts', {recursive:true});
fs.writeFileSync(`.artifacts/advisories-${cwd === '.' ? 'root' : 'worker'}.json`, JSON.stringify(report, null, 2));
console.log('Known dependency advisory matches (informational, require reachability triage):', report.metadata.vulnerabilities);
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
 console.log(name, entry.severity, [...new Set(entry.via.filter(v=>typeof v==='object').map(v=>v.url))].join(' '));
}
