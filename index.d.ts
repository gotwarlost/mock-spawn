declare module 'mock-spawn' {
  import { SpawnOptions } from 'child_process';
  import { EventEmitter } from 'events';
  /**
   * Returns a function that can be plugged into `child_process` as a replacement for `spawn`.
   *
   * @param verbose - True to see additional debug messages from this library.
   * @returns A MockSpawn function.
   */
  export default function(verbose?: boolean): Main;

  interface Runner {
    /**
     * Runs the sequence code calling `cb` when it is done.
     */
    (cb: (exitCode: number) => void): void;

    /**
     * A chainable function that sets the verbosity of the `Runner`.
     *
     * @remarks
     * Used internally.
     *
     * @param verbose - True to see additional debug messages from this library.
     * @returns the chained Runner.
     */
    setVerbose?(verbose: boolean): Runner;
  }

  interface Strategy {
    (command: string, args: string[], opts: SpawnOptions):
      | Runner
      | undefined
      | null;
    /**
     * Enables the `sequence` strategy and calls the runner function supplied at the specific point in the sequence.
     *
     * @remarks
     * Do not mix `sequence.add` and `setStrategy` calls for a specific run.
     *
     * @param fn - The runner function to use. The nth call to `add` plugs a runner function for the nth invocation to `spawn`.
     */
    add(fn: Runner | { throws: Error }): void;
  }

  interface Signals {
    [signal: string]: boolean;
  }

  /* eslint-disable require-jsdoc */
  class MockProcess extends EventEmitter {
    public constructor(runner: Runner, signals: Signals);
    public command: string;
    public args: string[];
    public opts: SpawnOptions;
    public exitCode: number;
    public signal: string;
  }

  interface Main {
    (command: string, args?: string[], opts?: SpawnOptions): MockProcess;
    /**
     * A strategy object that has an `add` function allowing runner functions to be appended in sequence.
     */
    readonly sequence: Strategy;
    /**
     * Array of mock process objects that you can use to inspect how your library under test invoked `spawn`. Every object has the following properties available.
     *
     * @returns An array of mock process objects.
     */
    readonly calls: MockProcess[];
    /**
     * Sets the default processing of all spawn invocations to use the runner function specified.
     *
     * @param fn - A runner function to handler default processing.
     */
    setDefault(fn: Runner): void;
    /**
     * Sets `fn` as the strategy that will return runner functions on demand.
     *
     * @remarks
     * Do not mix `sequence.add` and `setStrategy` calls for a specific run.
     *
     * @param fn - The function to be used as the strategy function.
     */
    setStrategy(fn: Strategy): void;
    /**
     * Returns a runner function that exits with the specified code and writes specific data to the output and error streams.
     *
     * @param exitCode - Exit code for the process.
     * @param stdout - The data to be written to standard output.
     * @param stderr - The data to be written to standard error.
     * @returns A runner function.
     */
    simple(exitCode: number, stdout?: string, stderr?: string): Runner;
    /**
     * Sets `obj` as a lookup table for whether to exit. If the value is `true`, then the runner will emit `exit` with code `null` and signal `<signal>`.
     *
     * @param obj - the object with signal names and whether to exit.
     */
    setSignals(obj: Signals): void;
  }
}
