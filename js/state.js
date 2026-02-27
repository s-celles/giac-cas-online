'use strict';

// Shared application state
let cellCounter = 0;
let cells = [];
let showDebug = false;
let reactiveMode = true;
let observableRuntime = null;
let observableModule = null;
let cellVariableMap = new Map();   // cellId → { variable, defines, references }
let variableOwnerMap = new Map();  // variableName → cellId
