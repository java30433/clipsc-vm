const Cast = require('../util/cast');
class Scratch3ProcedureBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            procedures_definition: this.definition,
            procedures_definition_return: this.definition,
            procedures_call: this.call,
            procedures_call_return: this.callReturn,
            procedures_return: this.return,
            argument_reporter_string_number: this.argumentReporterStringNumber,
            argument_reporter_boolean: this.argumentReporterBoolean
        };
    }

    definition () {
        // No-op: execute the blocks.
    }

    call (args, util) {
        if (util.stackFrame.executed !== util.currentBlockId) {
            const isGlobal = Cast.toBoolean(args.mutation.global);
            const procedureCode = args.mutation.proccode;
            const paramNamesIdsAndDefaults = util.getProcedureParamNamesIdsAndDefaults(procedureCode, isGlobal);

            // If null, procedure could not be found, which can happen if custom
            // block is dragged between sprites without the definition.
            // Match Scratch 2.0 behavior and noop.
            if (paramNamesIdsAndDefaults === null) return;

            const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

            // Initialize params for the current stackFrame to {}, even if the procedure does
            // not take any arguments. This is so that `getParam` down the line does not look
            // at earlier stack frames for the values of a given parameter (#1729)
            util.initParams();
            for (let i = 0; i < paramIds.length; i++) {
                if (args.hasOwnProperty(paramIds[i])) {
                    util.pushParam(paramNames[i], args[paramIds[i]]);
                } else {
                    util.pushParam(paramNames[i], paramDefaults[i]);
                }
            }

            util.stackFrame.executed = util.currentBlockId;
            util.startProcedure(procedureCode, isGlobal);
        }
    }

    callReturn (args, util) {
        if (util.stackFrame.executed !== util.currentBlockId) {
            const procedureCode = args.mutation.proccode;
            const isGlobal = Cast.toBoolean(args.mutation.global);
            const paramNamesIdsAndDefaults = util.getProcedureParamNamesIdsAndDefaults(procedureCode, isGlobal);

            // If null, procedure could not be found, which can happen if custom
            // block is dragged between sprites without the definition.
            // Match Scratch 2.0 behavior and noop.
            if (paramNamesIdsAndDefaults === null) return;

            const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

            // Initialize params for the current stackFrame to {}, even if the procedure does
            // not take any arguments. This is so that `getParam` down the line does not look
            // at earlier stack frames for the values of a given parameter (#1729)
            util.initParams();
            for (let i = 0; i < paramIds.length; i++) {
                if (args.hasOwnProperty(paramIds[i])) {
                    util.pushParam(paramNames[i], args[paramIds[i]]);
                } else {
                    util.pushParam(paramNames[i], paramDefaults[i]);
                }
            }

            util.stackFrame.executed = util.currentBlockId;
            // For the reason that the stack top is current command block,
            // rather than the call block, so we should push the block id.
            util.pushThreadStack(util.currentBlockId);
            util.startProcedure(procedureCode, isGlobal);
        }
    }

    return (args, util) {
        util.pushReportedValue(args.VALUE);
        util.stopThisScript();
        // For the same reason in callReturn
        util.popThreadStack();
    }

    argumentReporterStringNumber (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
    }

    argumentReporterBoolean (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
    }
}

module.exports = Scratch3ProcedureBlocks;
