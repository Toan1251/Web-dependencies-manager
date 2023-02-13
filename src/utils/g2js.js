// Suport convert .gradle to js Object Library


import stream from 'stream'
import fs from 'fs'
import * as deepAssign from 'lodash.merge'

let CHAR_TAB = 9;
let CHAR_NEWLINE = 10;
let CHAR_CARRIAGE_RETURN = 13;
let CHAR_SPACE = 32;
let CHAR_LEFT_PARENTHESIS = 40;
let CHAR_RIGHT_PARENTHESIS = 41;
let CHAR_PERIOD = 46;
let CHAR_SLASH = 47;
let CHAR_EQUALS = 61;
let CHAR_ARRAY_START = 91;
let CHAR_ARRAY_END = 93;
let CHAR_BLOCK_START = 123;
let CHAR_BLOCK_END = 125;

let KEYWORD_DEF = 'def';
let KEYWORD_IF = 'if';

let WHITESPACE_CHARACTERS = {};
WHITESPACE_CHARACTERS[CHAR_TAB] = true;
WHITESPACE_CHARACTERS[CHAR_NEWLINE] = true;
WHITESPACE_CHARACTERS[CHAR_CARRIAGE_RETURN] = true;
WHITESPACE_CHARACTERS[CHAR_SPACE] = true;

let SINGLE_LINE_COMMENT_START = '//';
let BLOCK_COMMENT_START = '/*';
let BLOCK_COMMENT_END = '*/';

let SPECIAL_KEYS = {
  repositories: parseRepositoryClosure,
  dependencies: parseDependencyClosure,
  plugins: parsePluginsClosure
};

let DEPS_KEYWORD_STRING_PATTERN = '[ \\t]*([A-Za-z0-9_-]+)[ \\t]*';
let DEPS_KEYWORD_STRING_REGEX = RegExp(DEPS_KEYWORD_STRING_PATTERN);
let DEPS_EASY_GAV_STRING_REGEX = RegExp('(["\']?)([\\w.-]+):([\\w.-]+):([\\w\\[\\]\\(\\),+.-]+)\\1');
let DEPS_HARD_GAV_STRING_REGEX = RegExp(DEPS_KEYWORD_STRING_PATTERN + '(?:\\((.*)\\)|(.*))');
let DEPS_ITEM_BLOCK_REGEX = RegExp(DEPS_KEYWORD_STRING_PATTERN + '\\(((["\']?)(.*)\\3)\\)[ \\t]*\\{');
let DEPS_EXCLUDE_LINE_REGEX = RegExp('exclude[ \\t]+([^\\n]+)', 'g');
let PLUGINS_LINE_PATTERN = RegExp('(id|version)[ \\t]*\\(?(["\']?)([A-Za-z0-9._-]+)\\2\\)?', 'g');


function deepParse(chunk, state, keepFunctionCalls, skipEmptyValues) {
  let out = {};

  let chunkLength = chunk.length;
  let character = 0;
  let tempString = '';
  let commentText = '';

  let currentKey = '';
  let parsingKey = true;
  let isBeginningOfLine = true;

  if (typeof skipEmptyValues === 'undefined') {
    skipEmptyValues = true;
  }

  for (; state.index < chunkLength; state.index++) {
    character = chunk[state.index];

    if (isBeginningOfLine && isWhitespace(character)) {
      continue;
    }

    if (!state.comment.parsing && isBeginningOfLine && isStartOfComment(tempString)) {
      isBeginningOfLine = false;
      if (isSingleLineComment(tempString)) {
        state.comment.setSingleLine();
      } else {
        state.comment.setMultiLine();
      }
      continue;
    }

    if (state.comment.multiLine && isEndOfMultiLineComment(commentText)) {
      state.comment.reset();

      isBeginningOfLine = true;
      tempString = '';
      commentText = '';
      continue;
    }

    if (state.comment.parsing && character != CHAR_NEWLINE) {
      commentText += String.fromCharCode(character);
      continue;
    }

    if (state.comment.parsing && isLineBreakCharacter(character)) {
      if (state.comment.singleLine) {
        state.comment.reset();
        isBeginningOfLine = true;

        currentKey = '';
        tempString = '';
        commentText = '';
        continue;
      } else {
        // NO-OP
        continue;
      }
    }

    if (parsingKey && !keepFunctionCalls && character === CHAR_LEFT_PARENTHESIS) {
      skipFunctionCall(chunk, state);
      currentKey = '';
      tempString = '';
      isBeginningOfLine = true;
      continue;
    }

    if (isLineBreakCharacter(character)) {
      if (!currentKey && tempString) {
        if (parsingKey) {
          if (isFunctionCall(tempString) && !keepFunctionCalls) {
            continue;
          } else {
            currentKey = tempString.trim();
            tempString = '';
          }
        }
      }

      if (tempString || (currentKey && !skipEmptyValues)) {
        addValueToStructure(out, currentKey, trimWrappingQuotes(tempString));

        currentKey = '';
        tempString = '';
      }

      parsingKey = true;
      isBeginningOfLine = true;

      state.comment.reset();
      continue;
    }

    // Only parse as an array if the first *real* char is a [
    if (!parsingKey && !tempString && character === CHAR_ARRAY_START) {
      out[currentKey] = parseArray(chunk, state);
      currentKey = '';
      tempString = '';
      continue;
    }

    if (character === CHAR_BLOCK_START) {
      // We need to skip the current (=start) character so that we literally "step into" the next closure/block
      state.index++;

      if (SPECIAL_KEYS.hasOwnProperty(currentKey)) {
        out[currentKey] = SPECIAL_KEYS[currentKey](chunk, state);
      } else if (out[currentKey]) {
        out[currentKey] = deepAssign({}, out[currentKey], deepParse(chunk, state, keepFunctionCalls, skipEmptyValues));
      } else {
        out[currentKey] = deepParse(chunk, state, keepFunctionCalls, skipEmptyValues);
      }
      currentKey = '';
    } else if (character === CHAR_BLOCK_END) {
      currentKey = '';
      tempString = '';
      break;
    } else if (isDelimiter(character) && parsingKey) {
      if (isKeyword(tempString)) {
        if (tempString === KEYWORD_DEF) {
          tempString = fetchDefinedNameOrSkipFunctionDefinition(chunk, state);
        } else if (tempString === KEYWORD_IF) {
          skipIfStatement(chunk, state);
          currentKey = '';
          tempString = '';
          continue;
        }
      }

      currentKey = tempString;
      tempString = '';
      parsingKey = false;
      if (!currentKey) {
        continue;
      }
    } else {
      if (!tempString && isDelimiter(character)) {
        continue;
      }
      tempString += String.fromCharCode(character);
      isBeginningOfLine = isBeginningOfLine && (character === CHAR_SLASH || isStartOfComment(tempString));
    }
  }

  // Add the last value to the structure
  addValueToStructure(out, currentKey, trimWrappingQuotes(tempString));
  return out;
}

function skipIfStatement(chunk, state) {
  skipFunctionCall(chunk, state);

  let character = '';
  let hasFoundTheCurlyBraces = false;
  let hasFoundAStatementWithoutBraces = false;
  let curlyBraceCount = 0;

  for (let max = chunk.length; state.index < max; state.index++) {
    character = chunk[state.index];

    if (hasFoundAStatementWithoutBraces) {
      if (isLineBreakCharacter(character)) {
        break;
      }
    } else {
      if (character === CHAR_BLOCK_START) {
        hasFoundTheCurlyBraces = true;
        curlyBraceCount++;
      } else if (character === CHAR_BLOCK_END) {
        curlyBraceCount--;
      } else if (!hasFoundTheCurlyBraces && !isWhitespace(character)) {
        hasFoundAStatementWithoutBraces = true;
      }

      if ((hasFoundTheCurlyBraces && curlyBraceCount === 0)) {
        break;
      }
    }
  }
  return curlyBraceCount === 0;
}

function skipFunctionDefinition(chunk, state) {
  let start = state.index;
  let parenthesisNest = 1;
  let character = chunk[++state.index];
  while (character !== undefined && parenthesisNest) {
    if (character === CHAR_LEFT_PARENTHESIS) {
      parenthesisNest++;
    } else if (character === CHAR_RIGHT_PARENTHESIS) {
      parenthesisNest--;
    }

    character = chunk[++state.index];
  }

  while (character && character !== CHAR_BLOCK_START) {
    character = chunk[++state.index];
  }

  character = chunk[++state.index];
  let blockNest = 1;
  while (character !== undefined && blockNest) {
    if (character === CHAR_BLOCK_START) {
      blockNest++;
    } else if (character === CHAR_BLOCK_END) {
      blockNest--;
    }

    character = chunk[++state.index];
  }

  state.index--;
}

function parseDependencyClosure(chunk, state) {
  return parseSpecialClosure(chunk, state, createStructureForDependencyItem);
}

function createStructureForDependencyItem(data) {
  let out = { group: '', name: '', version: '', type: '' };
  let compileBlockInfo = findDependencyItemBlock(data);
  if (compileBlockInfo['gav']) {
    out = parseGavString(compileBlockInfo['gav']);
    out['type'] = compileBlockInfo['type'];
    out['excludes'] = compileBlockInfo['excludes'];
  } else {
    out = parseGavString(data);
    let parsed = DEPS_KEYWORD_STRING_REGEX.exec(data);
    out['type'] = (parsed && parsed[1]) || '';
    out['excludes'] = [];
  }
  return out;
}

function parsePluginsClosure(chunk, state) {
  return parseSpecialClosure(chunk, state, createStructureForPlugin);
}

function createStructureForPlugin(pluginRow) {
  let out = {};

  let match;
  while(match = PLUGINS_LINE_PATTERN.exec(pluginRow)) {
    if (match && match[1]) {
      out[match[1]] = match[3];
    }
  }

  return out;
}

function findFirstSpaceOrTabPosition(input) {
  let position = input.indexOf(' ');
  if (position === -1) {
    position = input.indexOf('\t');
  }
  return position;
}

function findDependencyItemBlock(data) {
  let matches = DEPS_ITEM_BLOCK_REGEX.exec(data);
  if (matches && matches[2]) {
    let excludes = [];

    let match;
    while((match = DEPS_EXCLUDE_LINE_REGEX.exec(data))) {
      excludes.push(parseMapNotation(match[0].substring(findFirstSpaceOrTabPosition(match[0]))));
    }

    return { gav: matches[2], type: matches[1], excludes: excludes };
  }
  return [];
}

function parseGavString(gavString) {
  let out = { group: '', name: '', version: '' };
  let easyGavStringMatches = DEPS_EASY_GAV_STRING_REGEX.exec(gavString);
  if (easyGavStringMatches) {
    out['group'] = easyGavStringMatches[2];
    out['name'] = easyGavStringMatches[3];
    out['version'] = easyGavStringMatches[4];
  } else if (gavString.indexOf('project(') !== -1) {
    out['name'] = gavString.match(/(project\([^\)]+\))/g)[0];
  } else {
    let hardGavMatches = DEPS_HARD_GAV_STRING_REGEX.exec(gavString);
    if (hardGavMatches && (hardGavMatches[3] || hardGavMatches[2])) {
      out = parseMapNotationWithFallback(out, hardGavMatches[3] || hardGavMatches[2]);
    } else {
      out = parseMapNotationWithFallback(out, gavString, gavString.slice(findFirstSpaceOrTabPosition(gavString)));
    }
  }
  return out;
}

function parseMapNotationWithFallback(out, string, name) {
  let outFromMapNotation = parseMapNotation(string);
  if (outFromMapNotation['name']) {
    out = outFromMapNotation;
  } else {
    out['name'] = name ? name : string;
  }
  return out;
}

function parseMapNotation(input) {
  let out = {};
  let currentKey = '';
  let quotation = '';

  for (let i = 0, max = input.length; i < max; i++) {
    if (input[i] === ':') {
      currentKey = currentKey.trim();
      out[currentKey] = '';

      for (let innerLoop = 0, i = i + 1; i < max; i++) {
        if (innerLoop === 0) {
          // Skip any leading spaces before the actual value
          if (isWhitespaceLiteral(input[i])) {
            continue;
          }
        }

        // We just take note of what the "latest" quote was so that we can
        if (input[i] === '"' || input[i] === "'") {
          quotation = input[i];
          continue;
        }

        // Moving on to the next value if we find a comma
        if (input[i] === ',') {
          out[currentKey] = out[currentKey].trim();
          currentKey = '';
          break;
        }

        out[currentKey] += input[i];
        innerLoop++;
      }
    } else {
      currentKey += input[i];
    }
  }

  // If the last character contains a quotation mark, we remove it
  if (out[currentKey]) {
    out[currentKey] = out[currentKey].trim();
    if (out[currentKey].slice(-1) === quotation) {
      out[currentKey] = out[currentKey].slice(0, -1);
    }
  }
  return out;
}

function parseRepositoryClosure(chunk, state) {
  let out = [];
  let repository = deepParse(chunk, state, true, false);
  Object.keys(repository).map(function(item) {
    if (repository[item]) {
      out.push({type: item, data: repository[item]});
    } else {
      out.push({type: 'unknown', data: {name: item}});
    }
  });
  return out;
}

function parseSpecialClosure(chunk, state, mapFunction) {
  let out = [];
  // openBlockCount starts at 1 due to us entering after "<key> {"
  let openBlockCount = 1;
  let currentKey = '';
  let currentValue = '';

  let isInItemBlock = false;
  for (; state.index < chunk.length; state.index++) {
    if (chunk[state.index] === CHAR_BLOCK_START) {
      openBlockCount++;
    } else if (chunk[state.index] === CHAR_BLOCK_END) {
      openBlockCount--;
    } else {
      currentKey += String.fromCharCode(chunk[state.index]);
    }

    // Keys shouldn't have any leading nor trailing whitespace
    currentKey = currentKey.trim();

    if (isStartOfComment(currentKey)) {
      let commentText = currentKey;
      for (state.index = state.index + 1; state.index < chunk.length; state.index++) {
        if (isCommentComplete(commentText, chunk[state.index])) {
          currentKey = '';
          break;
        }
        commentText += String.fromCharCode(chunk[state.index]);
      }
    }


    if (currentKey && isWhitespace(chunk[state.index])) {
      let character = '';
      for (state.index = state.index + 1; state.index < chunk.length; state.index++) {
        character = chunk[state.index];
        currentValue += String.fromCharCode(character);

        if (character === CHAR_BLOCK_START) {
          isInItemBlock = true;
        } else if (isInItemBlock && character === CHAR_BLOCK_END) {
          isInItemBlock = false;
        } else if (!isInItemBlock) {
          if (isLineBreakCharacter(character) && currentValue) {
            break;
          }
        }
      }

      out.push(mapFunction(currentKey + ' ' + currentValue));
      currentKey = '';
      currentValue = '';
    }

    if (openBlockCount == 0) {
      break;
    }
  }
  return out;
}

function fetchDefinedNameOrSkipFunctionDefinition(chunk, state) {
  let character = 0;
  let temp = '';
  let isletiableDefinition = true;
  for (let max = chunk.length; state.index < max; state.index++) {
    character = chunk[state.index];

    if (character === CHAR_EQUALS) {
      // letiable definition, break and return name
      break;
    } else if (character === CHAR_LEFT_PARENTHESIS) {
      // Function definition, skip parsing
      isletiableDefinition = false;
      skipFunctionDefinition(chunk, state);
      break;
    }

    temp += String.fromCharCode(character);
  }

  if (isletiableDefinition) {
    let values = temp.trim().split(' ');
    return values[values.length - 1];
  } else {
    return '';
  }
}

function parseArray(chunk, state) {
  let character = 0;
  let temp = '';
  for (let max = chunk.length; state.index < max; state.index++) {
    character = chunk[state.index];
    if (character === CHAR_ARRAY_START) {
      continue;
    } else if (character === CHAR_ARRAY_END) {
      break;
    }
    temp += String.fromCharCode(character);
  }

  return temp.split(',').map(function(item) {
    return trimWrappingQuotes(item.trim());
  });
}

function skipFunctionCall(chunk, state) {
  let openParenthesisCount = 0;
  let character = '';
  for (let max = chunk.length; state.index < max; state.index++) {
    character = chunk[state.index];
    if (character === CHAR_LEFT_PARENTHESIS) {
      openParenthesisCount++;
    } else if (character === CHAR_RIGHT_PARENTHESIS) {
      openParenthesisCount--;
    }
    if (openParenthesisCount === 0 && !isWhitespace(character)) {
      state.index++;
      break;
    }
  }
  return openParenthesisCount === 0;
}

function addValueToStructure(structure, currentKey, value) {
  if (currentKey) {
    if (structure.hasOwnProperty(currentKey)) {
      if (structure[currentKey].constructor === Array) {
        structure[currentKey].push(getRealValue(value));
      } else {
        let oldValue = structure[currentKey];
        structure[currentKey] = [oldValue, getRealValue(value)];
      }
    } else {
      structure[currentKey] = getRealValue(value);
    }
  }
}

function getRealValue(value) {
  if (value === 'true' || value === 'false') { // booleans
    return value === 'true';
  }

  return value;
}

function trimWrappingQuotes(string) {
  let firstCharacter = string.slice(0, 1);
  if (firstCharacter === '"') {
    return string.replace(/^"([^"]+)"$/g, '$1');
  } else if (firstCharacter === '\'') {
    return string.replace(/^'([^']+)'$/g, '$1');
  }
  return string;
}

function isDelimiter(character) {
  return character === CHAR_SPACE || character === CHAR_EQUALS;
}

function isWhitespace(character) {
  return WHITESPACE_CHARACTERS.hasOwnProperty(character);
}

function isWhitespaceLiteral(character) {
  return isWhitespace(character.charCodeAt(0));
}

function isLineBreakCharacter(character) {
  return character == CHAR_CARRIAGE_RETURN || character == CHAR_NEWLINE
}

function isKeyword(string) {
  return string === KEYWORD_DEF || string === KEYWORD_IF;
}

function isSingleLineComment(comment) {
  return comment.slice(0, 2) === SINGLE_LINE_COMMENT_START;
}

function isStartOfComment(snippet) {
  return snippet === BLOCK_COMMENT_START || snippet === SINGLE_LINE_COMMENT_START;
}

function isCommentComplete(text, next) {
  return (isLineBreakCharacter(next) && isSingleLineComment(text)) || (isWhitespace(next) && isEndOfMultiLineComment(text));
}

function isEndOfMultiLineComment(comment) {
  return comment.slice(-2) === BLOCK_COMMENT_END;
}

function isFunctionCall(string) {
  return string.match(/\w+\(.*\);?$/) !== null;
}

function parse(readableStream) {
  return new Promise(function(resolve, reject) {
    let out = {};
    readableStream.on('data', function(chunk) {
      let state = {
        index: 0,
        comment: {
          parsing: false,
          singleLine: false,
          multiLine: false,

          setSingleLine: function() {
            this._setCommentState(true, false);
          },
          setMultiLine: function() {
            this._setCommentState(false, true);
          },
          reset: function() {
            this._setCommentState(false, false);
          },
          _setCommentState: function(singleLine, multiLine) {
            this.singleLine = singleLine;
            this.multiLine = multiLine;
            this.parsing = singleLine || multiLine;
          }
        }
      };
      out = deepParse(chunk, state, false, undefined);
    });

    readableStream.on('end', function() {
      resolve(out);
    });
    readableStream.on('error', function(error) {
      reject('Error parsing stream: ' + error);
    });
  });
}

function parseText(text) {
  let textAsStream = new stream.Readable();
  textAsStream._read = function noop() {};
  textAsStream.push(text);
  textAsStream.push(null);
  return parse(textAsStream);
}

function parseFile(path) {
  let stream = fs.createReadStream(path);
  return parse(stream);
}

export default {
  parseText: parseText,
  parseFile: parseFile
};
