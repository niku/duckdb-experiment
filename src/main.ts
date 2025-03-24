import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};
// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker!);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

const conn = await db.connect();
// duckdb wasm officially available extensions https://duckdb.org/docs/api/wasm/extensions
await conn.query(`
    INSTALL json;
    LOAD json;
    INSTALL excel;
    LOAD excel;
`);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>duckdb-experiment</h1>
  <input type="file" id="input" multiple />
  <div id="output"></div>
`;

const inputElement = document.getElementById("input")!;
inputElement.addEventListener("change", handleFiles, false);

async function handleFiles(this: HTMLInputElement) {
  const fileList = this.files; /* now you can work with the file list */
  const file = fileList![0];
  console.log(file);
  const fileName = file.name;

  // https://duckdb.org/docs/api/wasm/data_ingestion
  await db.registerFileHandle(
    fileName,
    file,
    duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
    true
  );
  const queryResult = await conn.query(
    `SELECT * FROM read_xlsx('${fileName}');`
  );

  const tableAsJson = queryResult.toArray().map((row: any) => row.toJSON());
  renderTable(tableAsJson);
}

function renderTable(data: any) {
  const outputElement = document.getElementById("output")!;
  outputElement.innerHTML = `
    <table>
      <thead>
        <tr>
          ${Object.keys(data[0])
            .map((key) => `<th>${key}</th>`)
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row: any) =>
              `<tr>${Object.values(row)
                .map((value: any) => `<td>${value}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}
