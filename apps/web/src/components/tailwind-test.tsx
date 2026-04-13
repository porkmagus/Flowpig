// Utility class test component
export default function TailwindTest() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-stone-50 to-stone-100">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-linear-accent">
          Tailwind + Design Tokens Test
        </h1>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-linear-surface">
            <span className="font-medium text-linear-text">Surface Token</span>
            <code className="px-2 py-1 bg-linear-border rounded text-sm">bg-linear-surface</code>
          </div>
          
          <button className="px-4 py-2 rounded-md bg-linear-accent text-white font-medium hover:bg-linear-accent-hover transition">
            Accent Button Token
          </button>
          
          <div className="border rounded-lg border-linear-border p-4">
            <p className="text-linear-text">
              Primary text token with <code className="text-linear-accent">accent</code> color
            </p>
            <p className="text-linear-text-secondary">Secondary text token</p>
          </div>
        </div>
      </div>
    </div>
  )
}