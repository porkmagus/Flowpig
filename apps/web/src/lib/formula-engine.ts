/**
 * Database Formula Engine
 * 
 * Executes formulas for database properties
 * Supports: basic math, property references, aggregations (count, sum, avg)
 */

export interface FormulaContext {
  row: Record<string, any>;
  rows: Record<string, any>[];
  properties: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

// Token types for formula parsing
type TokenType = 'NUMBER' | 'STRING' | 'PROPERTY' | 'OPERATOR' | 'FUNCTION' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

// Built-in functions
const BUILT_IN_FUNCTIONS: Record<string, (args: any[], context: FormulaContext) => any> = {
  // Math functions
  'SUM': (args) => args.reduce((a, b) => (parseFloat(a) || 0) + (parseFloat(b) || 0), 0),
  'AVG': (args) => {
    const nums = args.filter(a => !isNaN(parseFloat(a)));
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  },
  'COUNT': (args) => args.filter(a => a !== null && a !== undefined && a !== '').length,
  'MIN': (args) => Math.min(...args.filter(a => !isNaN(parseFloat(a))).map(a => parseFloat(a))),
  'MAX': (args) => Math.max(...args.filter(a => !isNaN(parseFloat(a))).map(a => parseFloat(a))),
  'ABS': (args) => Math.abs(parseFloat(args[0]) || 0),
  'ROUND': (args) => Math.round(parseFloat(args[0]) || 0),
  'FLOOR': (args) => Math.floor(parseFloat(args[0]) || 0),
  'CEIL': (args) => Math.ceil(parseFloat(args[0]) || 0),
  
  // String functions
  'CONCAT': (args) => args.join(''),
  'UPPER': (args) => String(args[0] || '').toUpperCase(),
  'LOWER': (args) => String(args[0] || '').toLowerCase(),
  'LENGTH': (args) => String(args[0] || '').length,
  'TRIM': (args) => String(args[0] || '').trim(),
  'SUBSTRING': (args) => String(args[0] || '').substring(parseInt(args[1]) || 0, parseInt(args[2])),
  'REPLACE': (args) => String(args[0] || '').replace(new RegExp(args[1], 'g'), args[2]),
  
  // Date functions
  'NOW': () => new Date().toISOString(),
  'TODAY': () => new Date().toISOString().split('T')[0],
  'YEAR': (args) => new Date(args[0] || new Date()).getFullYear(),
  'MONTH': (args) => new Date(args[0] || new Date()).getMonth() + 1,
  'DAY': (args) => new Date(args[0] || new Date()).getDate(),
  'DAYS_BETWEEN': (args) => {
    const d1 = new Date(args[0]);
    const d2 = new Date(args[1]);
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  },
  
  // Logic functions
  'IF': (args) => args[0] ? args[1] : args[2],
  'AND': (args) => args.every(a => !!a),
  'OR': (args) => args.some(a => !!a),
  'NOT': (args) => !args[0],
  'EQ': (args) => args[0] == args[1],
  'GT': (args) => parseFloat(args[0]) > parseFloat(args[1]),
  'LT': (args) => parseFloat(args[0]) < parseFloat(args[1]),
  'GTE': (args) => parseFloat(args[0]) >= parseFloat(args[1]),
  'LTE': (args) => parseFloat(args[0]) <= parseFloat(args[1]),
  
  // Rollup functions (aggregate over related rows)
  'ROLLUP_COUNT': (args, context) => context.rows.length,
  'ROLLUP_SUM': (args, context) => {
    const propName = args[0];
    return context.rows.reduce((sum, row) => sum + (parseFloat(row[propName]) || 0), 0);
  },
  'ROLLUP_AVG': (args, context) => {
    const propName = args[0];
    const values = context.rows.map(r => parseFloat(r[propName])).filter(v => !isNaN(v));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  },
  'ROLLUP_MIN': (args, context) => {
    const propName = args[0];
    const values = context.rows.map(r => parseFloat(r[propName])).filter(v => !isNaN(v));
    return values.length > 0 ? Math.min(...values) : null;
  },
  'ROLLUP_MAX': (args, context) => {
    const propName = args[0];
    const values = context.rows.map(r => parseFloat(r[propName])).filter(v => !isNaN(v));
    return values.length > 0 ? Math.max(...values) : null;
  },
};

// Tokenize formula string
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  
  while (pos < formula.length) {
    const char = formula[pos];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }
    
    // Numbers
    if (/\d/.test(char)) {
      let num = '';
      while (pos < formula.length && (/\d/.test(formula[pos]) || formula[pos] === '.')) {
        num += formula[pos];
        pos++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }
    
    // Strings (single or double quotes)
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      pos++;
      while (pos < formula.length && formula[pos] !== quote) {
        str += formula[pos];
        pos++;
      }
      pos++;
      tokens.push({ type: 'STRING', value: str });
      continue;
    }
    
    // Properties (curly braces: {Property Name})
    if (char === '{') {
      let prop = '';
      pos++;
      while (pos < formula.length && formula[pos] !== '}') {
        prop += formula[pos];
        pos++;
      }
      pos++;
      tokens.push({ type: 'PROPERTY', value: prop.trim() });
      continue;
    }
    
    // Functions or identifiers
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (pos < formula.length && /[a-zA-Z0-9_]/.test(formula[pos])) {
        id += formula[pos];
        pos++;
      }
      
      // Check if it's a function
      if (pos < formula.length && formula[pos] === '(') {
        tokens.push({ type: 'FUNCTION', value: id.toUpperCase() });
      } else {
        // Could be a property without braces
        tokens.push({ type: 'PROPERTY', value: id });
      }
      continue;
    }
    
    // Operators
    if (/[\+\-\*\/\^\%\=\!\>\<]/.test(char)) {
      let op = char;
      pos++;
      // Check for two-character operators
      if (pos < formula.length && /[\=\>]/.test(formula[pos]) && /[\!\=\>\<]/.test(char)) {
        op += formula[pos];
        pos++;
      }
      tokens.push({ type: 'OPERATOR', value: op });
      continue;
    }
    
    // Parentheses and commas
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char });
      pos++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char });
      pos++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char });
      pos++;
      continue;
    }
    
    // Unknown character - skip
    pos++;
  }
  
  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

// Parser for formula evaluation
class FormulaParser {
  private tokens: Token[];
  private pos: number;
  private context: FormulaContext;
  
  constructor(tokens: Token[], context: FormulaContext) {
    this.tokens = tokens;
    this.pos = 0;
    this.context = context;
  }
  
  private current(): Token {
    return this.tokens[this.pos];
  }
  
  private peek(offset: number = 1): Token {
    return this.tokens[this.pos + offset] || { type: 'EOF', value: '' };
  }
  
  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }
  
  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type}`);
    }
    this.pos++;
    return token;
  }
  
  parse(): any {
    return this.parseExpression();
  }
  
  private parseExpression(): any {
    return this.parseEquality();
  }
  
  private parseEquality(): any {
    let left = this.parseComparison();
    
    while (this.current().value === '==' || this.current().value === '!=') {
      const op = this.advance().value;
      const right = this.parseComparison();
      if (op === '==') left = left == right;
      else left = left != right;
    }
    
    return left;
  }
  
  private parseComparison(): any {
    let left = this.parseAdditive();
    
    while (['>', '<', '>=', '<='].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      switch (op) {
        case '>': left = parseFloat(left) > parseFloat(right); break;
        case '<': left = parseFloat(left) < parseFloat(right); break;
        case '>=': left = parseFloat(left) >= parseFloat(right); break;
        case '<=': left = parseFloat(left) <= parseFloat(right); break;
      }
    }
    
    return left;
  }
  
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    
    while (this.current().value === '+' || this.current().value === '-') {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      if (op === '+') left = parseFloat(left) + parseFloat(right);
      else left = parseFloat(left) - parseFloat(right);
    }
    
    return left;
  }
  
  private parseMultiplicative(): any {
    let left = this.parsePower();
    
    while (this.current().value === '*' || this.current().value === '/' || this.current().value === '%') {
      const op = this.advance().value;
      const right = this.parsePower();
      if (op === '*') left = parseFloat(left) * parseFloat(right);
      else if (op === '/') left = parseFloat(left) / parseFloat(right);
      else left = parseFloat(left) % parseFloat(right);
    }
    
    return left;
  }
  
  private parsePower(): any {
    let left = this.parseUnary();
    
    while (this.current().value === '^') {
      this.advance();
      const right = this.parseUnary();
      left = Math.pow(parseFloat(left), parseFloat(right));
    }
    
    return left;
  }
  
  private parseUnary(): any {
    if (this.current().value === '-') {
      this.advance();
      return -parseFloat(this.parseUnary());
    }
    if (this.current().value === '!') {
      this.advance();
      return !this.parseUnary();
    }
    return this.parsePrimary();
  }
  
  private parsePrimary(): any {
    const token = this.current();
    
    switch (token.type) {
      case 'NUMBER':
        this.advance();
        return parseFloat(token.value);
      
      case 'STRING':
        this.advance();
        return token.value;
      
      case 'PROPERTY':
        this.advance();
        return this.getPropertyValue(token.value);
      
      case 'FUNCTION':
        return this.parseFunction();
      
      case 'LPAREN':
        this.advance();
        const value = this.parseExpression();
        this.expect('RPAREN');
        return value;
      
      default:
        return null;
    }
  }
  
  private parseFunction(): any {
    const funcName = this.advance().value;
    this.expect('LPAREN');
    
    const args: any[] = [];
    
    // Parse arguments
    while (this.current().type !== 'RPAREN' && this.current().type !== 'EOF') {
      args.push(this.parseExpression());
      
      if (this.current().type === 'COMMA') {
        this.advance();
      }
    }
    
    this.expect('RPAREN');
    
    // Execute function
    const func = BUILT_IN_FUNCTIONS[funcName];
    if (!func) {
      throw new Error(`Unknown function: ${funcName}`);
    }
    
    return func(args, this.context);
  }
  
  private getPropertyValue(propertyName: string): any {
    // Find property by name
    const prop = this.context.properties.find(
      p => p.name.toLowerCase() === propertyName.toLowerCase()
    );
    
    if (prop) {
      return this.context.row[prop.name] ?? null;
    }
    
    // Try direct access
    return this.context.row[propertyName] ?? null;
  }
}

// Main formula execution function
export function executeFormula(formula: string, context: FormulaContext): any {
  try {
    if (!formula || formula.trim() === '') {
      return null;
    }
    
    const tokens = tokenize(formula);
    const parser = new FormulaParser(tokens, context);
    const result = parser.parse();
    
    // Format result
    if (typeof result === 'number') {
      // Round to reasonable precision
      return Math.round(result * 10000) / 10000;
    }
    
    return result;
  } catch (error) {
    console.error('Formula execution error:', error);
    return '#ERROR';
  }
}

// Validate formula syntax
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    if (!formula || formula.trim() === '') {
      return { valid: true };
    }
    
    const tokens = tokenize(formula);
    const context: FormulaContext = {
      row: {},
      rows: [],
      properties: [],
    };
    const parser = new FormulaParser(tokens, context);
    parser.parse();
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}

// Get list of properties referenced in formula
export function getReferencedProperties(formula: string): string[] {
  const tokens = tokenize(formula);
  const properties: string[] = [];
  
  for (const token of tokens) {
    if (token.type === 'PROPERTY') {
      properties.push(token.value);
    }
  }
  
  return [...new Set(properties)];
}

// Format value for display
export function formatFormulaValue(value: any, type: 'number' | 'text' | 'date' | 'checkbox' = 'text'): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  switch (type) {
    case 'number':
      if (typeof value === 'number') {
        // Check if it's a whole number
        if (Number.isInteger(value)) {
          return value.toString();
        }
        return value.toFixed(2);
      }
      return String(value);
    
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return String(value);
    
    case 'checkbox':
      return value ? 'Yes' : 'No';
    
    default:
      return String(value);
  }
}
