import createSolverModule from './solver.js';

let modulePromise = null;

function getModule() {
    if (!modulePromise) {
        modulePromise = createSolverModule();
    }
    return modulePromise;
}

self.addEventListener('message', async (event) => {
    const { id, algo, board } = event.data;
    try {
        const mod = await getModule();
        const rawJson = mod.ccall(
            'solve_puzzle',
            'string',
            ['number', 'string'],
            [Number(algo), String(board)]
        );
        const data = JSON.parse(rawJson);
        if (data && data.error) {
            self.postMessage({ id, error: data.error });
            return;
        }
        self.postMessage({ id, data });
    } catch (err) {
        self.postMessage({
            id,
            error: err instanceof Error ? err.message : String(err)
        });
    }
});
