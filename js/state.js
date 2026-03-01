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
let viewMode = 'code';             // 'code' | 'report'
let currentKernel = 'giac-js';     // active kernel ID
let defaultKernel = 'giac-js';     // user's default kernel preference (persisted in localStorage)
