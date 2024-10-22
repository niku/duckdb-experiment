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
    INSTALL parquet;
    LOAD parquet;
    INSTALL spatial;
    LOAD spatial;
`);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>duckdb-experiment</h1>
    <input type="file" id="input" multiple />
    <br />
    <button id="loadxlsx">Load XLSX via http</button>
  </div>
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
  const queryResult = await conn.query(`SELECT * FROM ${fileName};`);

  const tableAsJson = queryResult.toArray().map((row: any) => row.toJSON());
  console.log(tableAsJson);
}

const loadxlsxElement = document.getElementById("loadxlsx")!;
loadxlsxElement.addEventListener("click", loadxlsx, false);

async function loadxlsx(this: HTMLInputElement) {
  const queryResult = await conn.query(
    `SELECT * FROM ST_READ('http://localhost:5173/book1.xlsx');`
  );

  const tableAsJson = queryResult.toArray().map((row: any) => row.toJSON());
  console.table(tableAsJson);
}
