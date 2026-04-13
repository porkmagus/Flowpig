import { useState, useEffect } from 'react';
import { FunctionSquare, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { validateFormula, executeFormula, getReferencedProperties, type FormulaContext } from '~/lib/formula-engine';

interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  properties: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  placeholder?: string;
}

const FUNCTION_SUGGESTIONS = [
  { name: 'SUM', description: 'Sum of numbers', example: 'SUM({Price}, {Tax})' },
  { name: 'AVG', description: 'Average of numbers', example: 'AVG({Score1}, {Score2})' },
  { name: 'COUNT', description: 'Count of non-empty values', example: 'COUNT({Name}, {Email})' },
  { name: 'MIN', description: 'Minimum value', example: 'MIN({Price1}, {Price2})' },
  { name: 'MAX', description: 'Maximum value', example: 'MAX({Price1}, {Price2})' },
  { name: 'IF', description: 'Conditional value', example: 'IF({Status} == "Done", 100, 0)' },
  { name: 'CONCAT', description: 'Concatenate strings', example: 'CONCAT({First}, " ", {Last})' },
  { name: 'DAYS_BETWEEN', description: 'Days between dates', example: 'DAYS_BETWEEN({Start}, {End})' },
  { name: 'ROUND', description: 'Round number', example: 'ROUND({Price})' },
  { name: 'ROLLUP_SUM', description: 'Sum of related rows', example: 'ROLLUP_SUM({Amount})' },
  { name: 'ROLLUP_COUNT', description: 'Count of related rows', example: 'ROLLUP_COUNT()' },
  { name: 'ROLLUP_AVG', description: 'Average of related rows', example: 'ROLLUP_AVG({Rating})' },
];

export function FormulaInput({ value, onChange, properties, placeholder = "Enter formula..." }: FormulaInputProps) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [previewValue, setPreviewValue] = useState<any>(null);
  const [referencedProps, setReferencedProps] = useState<string[]>([]);

  useEffect(() => {
    const result = validateFormula(value);
    setValidation(result);
    
    if (result.valid) {
      // Generate preview with sample data
      const sampleRow: Record<string, any> = {};
      const props = getReferencedProperties(value);
      setReferencedProps(props);
      
      props.forEach(propName => {
        // Generate sample values based on property name/type
        if (propName.toLowerCase().includes('price') || propName.toLowerCase().includes('amount')) {
          sampleRow[propName] = 100;
        } else if (propName.toLowerCase().includes('count') || propName.toLowerCase().includes('quantity')) {
          sampleRow[propName] = 5;
        } else if (propName.toLowerCase().includes('date') || propName.toLowerCase().includes('day')) {
          sampleRow[propName] = new Date().toISOString();
        } else {
          sampleRow[propName] = 'Sample';
        }
      });
      
      const context: FormulaContext = {
        row: sampleRow,
        rows: [sampleRow, sampleRow, sampleRow],
        properties: properties.map(p => ({ id: p.id, name: p.name, type: p.type })),
      };
      
      const result = executeFormula(value, context);
      setPreviewValue(result);
    }
  }, [value, properties]);

  const insertProperty = (propName: string) => {
    onChange(value + `{${propName}}`);
  };

  const insertFunction = (funcName: string) => {
    onChange(value + funcName + '()');
  };

  return (
    <div className="space-y-3">
      {/* Formula Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <FunctionSquare className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-primary-500
            ${validation?.valid === false ? 'border-red-300 bg-red-50' : 'border-gray-200'}
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validation?.valid === false ? (
            <span title={validation.error}>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </span>
          ) : validation?.valid === true ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : null}
        </div>
      </div>

      {/* Validation Error */}
      {validation?.valid === false && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Preview */}
      {validation?.valid && previewValue !== null && previewValue !== undefined && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
          <span className="text-gray-400">Preview:</span>
          <span className="font-medium text-gray-900">
            {typeof previewValue === 'boolean' ? (previewValue ? 'true' : 'false') : String(previewValue)}
          </span>
        </div>
      )}

      {/* Referenced Properties */}
      {referencedProps.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">References:</span>
          {referencedProps.map((prop) => (
            <span
              key={prop}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md"
            >
              {'{'}{prop}{'}'}
            </span>
          ))}
        </div>
      )}

      {/* Help Toggle */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
      >
        <HelpCircle className="w-4 h-4" />
        {showHelp ? 'Hide formula help' : 'Show formula help'}
      </button>

      {/* Help Panel */}
      {showHelp && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Properties */}
          <div className="p-3 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Available Properties
            </h4>
            <div className="flex flex-wrap gap-1">
              {properties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => insertProperty(prop.name)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                >
                  {'{'}{prop.name}{'}'}
                </button>
              ))}
            </div>
          </div>

          {/* Functions */}
          <div className="p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Functions
            </h4>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {FUNCTION_SUGGESTIONS.map((func) => (
                <button
                  key={func.name}
                  onClick={() => insertFunction(func.name)}
                  className="text-left p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{func.name}</div>
                  <div className="text-xs text-gray-500">{func.description}</div>
                  <code className="text-xs text-primary-600 bg-primary-50 px-1 rounded mt-1 inline-block">
                    {func.example}
                  </code>
                </button>
              ))}
            </div>
          </div>

          {/* Operators */}
          <div className="p-3 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Operators
            </h4>
            <div className="flex flex-wrap gap-1">
              {['+', '-', '*', '/', '%', '==', '!=', '>', '<', '>=', '<=', '&&', '||'].map((op) => (
                <button
                  key={op}
                  onClick={() => onChange(value + op)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 font-mono transition-colors"
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
