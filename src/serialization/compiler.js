const uid = require('../util/uid');

/**
 * 
 * @param {序列化后的target} target 
 */
const compileTarget = function (target) {

    /**
     * 随机生成变量
     * @returns 变量id
     */
    const genVariable = function () {
        const id = uid();
        target.variables[id] = [id, 0];
        return id;
    }

    const blocks = target.blocks
    const varR = genVariable();
    //一次性调用返回值存储的变量列表
    const varList = [];

    const checkInputs = function (inputBlockID, lineBlockID, addVar = false) {
        if (!blocks[inputBlockID]) return;
        var inputIndex = 0;
        var returnCallIndex = 0;
        for (const inputss of Object.values(blocks[inputBlockID].inputs)) {
            for (const inputID of inputss) {
                if (inputID.constructor == String) {
                    if (blocks[inputID] && blocks[inputID].opcode == "procedures_call_return") {
                        const lineBlock = blocks[lineBlockID];
                        var varCur;
                        if (addVar) {
                            varList.push(genVariable());
                            varCur = varList[varList.length - 1];
                        } else {
                            if (varList.length == returnCallIndex) {
                                varList.push(genVariable());
                            }
                            varCur = varList[returnCallIndex];
                        }
                        const returnCallBlock = blocks[inputID];
    
                        const commandBlockID = uid();
                        blocks[commandBlockID] = returnCallBlock;
                        const commandBlock = blocks[commandBlockID];
                        commandBlock.opcode = "procedures_call";
                        commandBlock.mutation.return = "false"; //这个bool居然是用String存的
    
                        blocks[lineBlock.parent].next = commandBlockID;
                        commandBlock.parent = lineBlock.parent;
    
                        const varSetBlockID = uid();
                        const varSetBlock = {};
                        varSetBlock.opcode = "data_setvariableto";
                        varSetBlock.parent = commandBlockID;
                        commandBlock.next = varSetBlockID;
                        varSetBlock.next = lineBlockID;
                        lineBlock.parent = varSetBlockID;
                        varSetBlock.inputs = {};
                        varSetBlock.inputs["VALUE"] = [1, [12, varR, varR]];
                        varSetBlock.fields = {};
                        varSetBlock.fields["VARIABLE"] = [varCur, varCur];
                        varSetBlock.shadow = false;
                        varSetBlock.topLevel = false;
                        blocks[varSetBlockID] = varSetBlock;
    
                        const inputBlock = blocks[inputBlockID];
                        inputBlock.inputs[Object.keys(inputBlock.inputs)[inputIndex]] = [1, [12, varCur, varCur]];
    
                        delete blocks[inputID];
    
                        checkAndReplaceReturnCall(commandBlockID, true);
    
                        returnCallIndex++;
                    } else {
                        checkInputs(inputID, lineBlockID, addVar);
                    }
                }
            }
            inputIndex++;
        }
    }
    /**
     * 检测积木中的返回值调用并编译
     * @param {String} lineBlockID 要检测的积木ID，必须是一行的，不是reporter
     */
    const checkAndReplaceReturnCall = function (lineBlockID, addVar = false) {
        checkInputs(lineBlockID, lineBlockID, addVar);
    }

    /**
     * 
     * @param {String} topBlockID 顶部积木
     */
    const foreachTopBlock = function (topBlockID) {
        var topBlock = blocks[topBlockID];
        while (topBlock != null) {
            switch (topBlock.opcode) {
                /*
                //返回%s 积木替换为设置变量R
                case 'procedures_return':
                    topBlock.opcode = "data_setvariableto";
                    topBlock.fields["VARIABLE"] = [varR, varR];
                    break;
                */
                //返回值定义框 替换为普通的
                case 'procedures_definition_return':
                    topBlock.opcode = "procedures_definition";
                    const prototypeBlock = blocks[topBlock.inputs.custom_block[1]];
                    if (prototypeBlock.opcode == 'procedures_prototype_return') {
                        prototypeBlock.opcode = "procedures_prototype";
                        prototypeBlock.mutation.return = "false";
                    }
                    break;
            }
            for (const inputName in topBlock.inputs) {
                if (inputName.startsWith("SUBSTACK")) {
                    foreachTopBlock(topBlock.inputs[inputName][1]);
                }
            }
            checkAndReplaceReturnCall(topBlockID, false);
            topBlockID = topBlock.next;
            topBlock = blocks[topBlockID];
        }
    }
    //TODO 清除无顶层积木

    const topBlockIDs = [];
    for (const blockID in blocks) {
        if (blocks[blockID].topLevel == true) topBlockIDs.push(blockID);
    }
    for (var topBlockID of topBlockIDs) {
        foreachTopBlock(topBlockID);
    }

    console.info(target);
};

module.exports = {
    compileTarget: compileTarget
}