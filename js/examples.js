'use strict';

// ─────────────────────────────────────────────────────────────
// EXAMPLE NOTEBOOK LIBRARY
//
// Text cells use i18n keys (resolved at load time via t()).
// Math/raw cells are language-independent.
// ─────────────────────────────────────────────────────────────

var EXAMPLE_DATA = {
  'full-demo': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exWelcome', hidden: true },
      { type: 'raw', content: 'p := 5' },
      { type: 'raw', content: 'p^2' },
      { type: 'raw', content: 'q := p + 3' },
      { type: 'math', content: '\\frac{x^4-1}{x^2+1}' },
      { type: 'math', content: '\\int \\frac{1}{x^2+1}\\, dx' },
      { type: 'math', content: '\\frac{d}{dx}\\left(\\sin(x)\\cdot e^x\\right)' },
      { type: 'math', content: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}' },
      { type: 'math', content: '\\sum_{k=1}^{n} k' },
      { type: 'math', content: '\\prod_{k=1}^{n} k' },
      { type: 'math', content: '\\sum_{k=1}^{10} k^2' },
      { type: 'math', content: '\\prod_{k=1}^{5} k' },
      { type: 'math', content: '\\sum_{k=1}^{100} \\frac{1}{k^2}' },
      { type: 'math', content: '\\prod_{k=1}^{8} k' },
      { type: 'math', content: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}' },
      { type: 'math', content: '\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{2n+1}' },
      { type: 'math', content: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}' },
      { type: 'math', content: '\\lim_{x \\to 0^-} \\frac{1}{x}' },
      { type: 'math', content: '\\lim_{x \\to 0^+} \\frac{1}{x}' },
      { type: 'math', content: '\\lim_{x \\to 0^-} \\frac{|x|}{x}' },
      { type: 'math', content: '\\lim_{x \\to 0^+} \\frac{|x|}{x}' },
      { type: 'math', content: '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}' },
      { type: 'math', content: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { type: 'math', content: '\\det\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}' },
      { type: 'math', content: '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { type: 'raw', content: 'eigenvalues([[1,2],[3,4]])' },
      { type: 'raw', content: 'tran([[1,2],[3,4]])' },
      { type: 'raw', content: 'eigenvalues([[a,b],[c,d]])' },
      { type: 'raw', content: 'solve(x^2 - 3*x + 2 = 0, x)' },
      { type: 'raw', content: 'plot(sin(x))' },
      { type: 'raw', content: 'plotfunc([sin(x),cos(x)],x)' },
      { type: 'raw', content: 'plot([sin(x),sin(x-pi/3),sin(x-2*pi/3)],x)' },
      { type: 'raw', content: 'plotfunc(x^2+y^2,[x,y])' },
      { type: 'raw', content: 'plotimplicit(x^2+y^2-1,x,y)' },
      { type: 'raw', content: 'plotfield(sin(x*y),[x,y])' },
      { type: 'raw', content: 'plotcontour(x^2+y^2,[x=-3..3,y=-3..3])' },
      { type: 'raw', content: 'plotode(sin(t*y),[t,y],[0,1])' },
      { type: 'raw', content: 'plotseq(cos(x),0.5,5)' },
      { type: 'raw', content: 'histogram(seq(rand(100),k,1,200))' },
      { type: 'raw', content: 'barplot([3,5,2,8,1])' },
      { type: 'raw', content: 'gl_ortho=1; camembert([["Maths",35],["Physique",25],["Chimie",20],["Info",20]])' },
      { type: 'raw', content: 'boxwhisker([1,2,3,4,5,6,7,8,9,10])' },
      { type: 'raw', content: 'scatterplot([1,2,3,4,5],[2,4,5,4,5])' },
      { type: 'raw', content: 'circle(0,2); segment([0,0],[2,0]); point(1,1)' },
      { type: 'raw', content: 'plotfunc(sin(x)*cos(y),[x=-pi..pi,y=-pi..pi])' }
    ]
  },

  'arithmetic': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exArithTitle', hidden: true },
      { type: 'raw', content: '2 + 3' },
      { type: 'raw', content: '7 * 8' },
      { type: 'raw', content: '100 / 7' },
      { type: 'raw', content: 'exact(100/7)' },
      { type: 'raw', content: '2^10' },
      { type: 'raw', content: 'ifactor(360)' },
      { type: 'raw', content: 'gcd(48, 36)' },
      { type: 'raw', content: 'lcm(12, 18)' },
      { type: 'raw', content: 'iquo(17, 5)' },
      { type: 'raw', content: 'irem(17, 5)' }
    ]
  },

  'algebra': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exAlgebraTitle', hidden: true },
      { type: 'raw', content: 'expand((x+1)^3)' },
      { type: 'raw', content: 'factor(x^3 - 1)' },
      { type: 'raw', content: 'simplify((x^2-1)/(x-1))' },
      { type: 'raw', content: 'solve(x^2 - 5*x + 6 = 0, x)' },
      { type: 'raw', content: 'solve(x^3 - 6*x^2 + 11*x - 6 = 0, x)' },
      { type: 'raw', content: 'solve([x + y = 5, x - y = 1], [x, y])' },
      { type: 'math', content: '\\frac{x^4-1}{x^2+1}' },
      { type: 'raw', content: 'partfrac(1/(x^2-1))' },
      { type: 'raw', content: 'subst(x^2 + 2*x + 1, x=3)' }
    ]
  },

  'calculus': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exCalculusTitle', hidden: true },
      { type: 'text', i18n: 'exCalculusLimits', hidden: true },
      { type: 'math', content: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}' },
      { type: 'math', content: '\\lim_{x \\to +\\infty} \\left(1+\\frac{1}{x}\\right)^x' },
      { type: 'math', content: '\\lim_{x \\to 0^+} x \\cdot \\ln(x)' },
      { type: 'text', i18n: 'exCalculusDerivatives', hidden: true },
      { type: 'math', content: '\\frac{d}{dx}\\left(\\sin(x)\\cdot e^x\\right)' },
      { type: 'raw', content: 'diff(x^3 * ln(x), x)' },
      { type: 'raw', content: 'diff(atan(x), x)' },
      { type: 'text', i18n: 'exCalculusIntegrals', hidden: true },
      { type: 'math', content: '\\int \\frac{1}{x^2+1}\\, dx' },
      { type: 'raw', content: 'int(x * exp(-x), x)' },
      { type: 'raw', content: 'int(sin(x)^2, x, 0, pi)' },
      { type: 'text', i18n: 'exCalculusTaylor', hidden: true },
      { type: 'raw', content: 'taylor(exp(x), x=0, 5)' },
      { type: 'raw', content: 'taylor(sin(x), x=0, 7)' }
    ]
  },

  'sums-series': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exSumsTitle', hidden: true },
      { type: 'text', i18n: 'exSumsFinite', hidden: true },
      { type: 'math', content: '\\sum_{k=1}^{n} k' },
      { type: 'math', content: '\\sum_{k=1}^{n} k^2' },
      { type: 'math', content: '\\sum_{k=1}^{10} k^2' },
      { type: 'math', content: '\\prod_{k=1}^{n} k' },
      { type: 'math', content: '\\prod_{k=1}^{8} k' },
      { type: 'text', i18n: 'exSumsInfinite', hidden: true },
      { type: 'math', content: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}' },
      { type: 'math', content: '\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{2n+1}' },
      { type: 'math', content: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}' }
    ]
  },

  'linear-algebra': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exLinAlgTitle', hidden: true },
      { type: 'text', i18n: 'exLinAlgMatrices', hidden: true },
      { type: 'math', content: '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}' },
      { type: 'raw', content: 'tran([[1,2],[3,4]])' },
      { type: 'raw', content: '[[1,2],[3,4]] * [[5,6],[7,8]]' },
      { type: 'raw', content: 'inv([[1,2],[3,4]])' },
      { type: 'text', i18n: 'exLinAlgDet', hidden: true },
      { type: 'math', content: '\\det\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}' },
      { type: 'math', content: '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { type: 'text', i18n: 'exLinAlgEigen', hidden: true },
      { type: 'raw', content: 'eigenvalues([[1,2],[3,4]])' },
      { type: 'raw', content: 'eigenvects([[1,2],[3,4]])' },
      { type: 'raw', content: 'eigenvalues([[a,b],[c,d]])' },
      { type: 'raw', content: 'rank([[1,2,3],[4,5,6],[7,8,9]])' },
      { type: 'raw', content: 'ker([[1,2,3],[4,5,6],[7,8,9]])' }
    ]
  },

  'plots': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exPlotsTitle', hidden: true },
      { type: 'text', i18n: 'exPlots2D', hidden: true },
      { type: 'raw', content: 'plot(sin(x))' },
      { type: 'raw', content: 'plotfunc([sin(x),cos(x)],x)' },
      { type: 'raw', content: 'plot([sin(x),sin(x-pi/3),sin(x-2*pi/3)],x)' },
      { type: 'text', i18n: 'exPlotsImplicit', hidden: true },
      { type: 'raw', content: 'plotimplicit(x^2+y^2-1,x,y)' },
      { type: 'raw', content: 'plotfield(sin(x*y),[x,y])' },
      { type: 'raw', content: 'plotcontour(x^2+y^2,[x=-3..3,y=-3..3])' },
      { type: 'text', i18n: 'exPlotsDiffEq', hidden: true },
      { type: 'raw', content: 'plotode(sin(t*y),[t,y],[0,1])' },
      { type: 'raw', content: 'plotseq(cos(x),0.5,5)' },
      { type: 'text', i18n: 'exPlotsStats', hidden: true },
      { type: 'raw', content: 'histogram(seq(rand(100),k,1,200))' },
      { type: 'raw', content: 'barplot([3,5,2,8,1])' },
      { type: 'raw', content: 'boxwhisker([1,2,3,4,5,6,7,8,9,10])' },
      { type: 'raw', content: 'scatterplot([1,2,3,4,5],[2,4,5,4,5])' },
      { type: 'raw', content: 'gl_ortho=1; camembert([["Maths",35],["Physique",25],["Chimie",20],["Info",20]])' },
      { type: 'text', i18n: 'exPlotsGeom', hidden: true },
      { type: 'raw', content: 'circle(0,2); segment([0,0],[2,0]); point(1,1)' },
      { type: 'text', i18n: 'exPlots3D', hidden: true },
      { type: 'raw', content: 'plotfunc(x^2+y^2,[x,y])' },
      { type: 'raw', content: 'plotfunc(sin(x)*cos(y),[x=-pi..pi,y=-pi..pi])' }
    ]
  },

  'reactive-dag': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exReactiveTitle', hidden: true },
      { type: 'raw', content: 'p := 5' },
      { type: 'raw', content: 'p^2' },
      { type: 'raw', content: 'q := p + 3' },
      { type: 'raw', content: 'q * 2' },
      { type: 'raw', content: 'r := p + q' },
      { type: 'raw', content: 'r^2 - p*q' }
    ]
  },

  'physics-mechanics': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exMechTitle', hidden: true },
      { type: 'text', i18n: 'exMechKinematics', hidden: true },
      { type: 'raw', content: 'v0 := 10' },
      { type: 'raw', content: 'a := 9.81' },
      { type: 'raw', content: 't := 2' },
      { type: 'raw', content: 'v := v0 + a*t' },
      { type: 'raw', content: 'x := v0*t + (1/2)*a*t^2' },
      { type: 'text', i18n: 'exMechFreeFall', hidden: true },
      { type: 'raw', content: 'solve(v0*t - (1/2)*g*t^2 = 0, t)' },
      { type: 'raw', content: 'solve(v0 - g*t = 0, t)' },
      { type: 'text', i18n: 'exMechEnergy', hidden: true },
      { type: 'raw', content: 'm := 2' },
      { type: 'raw', content: 'Ec := (1/2)*m*v^2' },
      { type: 'raw', content: 'h := 5' },
      { type: 'raw', content: 'Ep := m*9.81*h' },
      { type: 'raw', content: 'Em := Ec + Ep' },
      { type: 'text', i18n: 'exMechTrajectory', hidden: true },
      { type: 'raw', content: 'plotfunc(10*x - 4.905*x^2, x=0..2.1)' },
      { type: 'text', i18n: 'exMechNewton', hidden: true },
      { type: 'raw', content: 'desolve(m*y\'\' = -m*g, y)' },
      { type: 'raw', content: 'desolve(m*y\'\' + k*y = 0, y)' },
      { type: 'text', i18n: 'exMechFriction', hidden: true },
      { type: 'raw', content: 'desolve(m*y\'\' = -m*g - f*y\', y)' },
      { type: 'text', i18n: 'exMechCircular', hidden: true },
      { type: 'raw', content: 'R := 5' },
      { type: 'raw', content: 'omega := 2*pi' },
      { type: 'raw', content: 'ac := omega^2 * R' },
      { type: 'raw', content: 'plot([R*cos(omega*t), R*sin(omega*t)], t=0..1)' }
    ]
  },

  'physics-waves': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exWavesTitle', hidden: true },
      { type: 'text', i18n: 'exWavesHarmonic', hidden: true },
      { type: 'raw', content: 'omega := 2*pi' },
      { type: 'raw', content: 'A := 3' },
      { type: 'raw', content: 'phi := pi/4' },
      { type: 'raw', content: 'plot(A*sin(omega*t + phi), t=0..2)' },
      { type: 'text', i18n: 'exWavesSuper', hidden: true },
      { type: 'raw', content: 'plot([sin(x), sin(x-pi/3), sin(x-2*pi/3)], x)' },
      { type: 'text', i18n: 'exWavesBeats', hidden: true },
      { type: 'raw', content: 'plot(sin(10*t) + sin(11*t), t=0..4*pi)' },
      { type: 'text', i18n: 'exWavesDamped', hidden: true },
      { type: 'raw', content: 'plot(exp(-0.3*t)*cos(5*t), t=0..10)' },
      { type: 'text', i18n: 'exWavesODE', hidden: true },
      { type: 'raw', content: 'desolve(y\'\' + 4*y = 0, y)' },
      { type: 'raw', content: 'desolve(y\'\' + 0.5*y\' + 4*y = 0, y)' },
      { type: 'text', i18n: 'exWavesStanding', hidden: true },
      { type: 'raw', content: 'plot(sin(3*x)*cos(5*t), t=0..2*pi)' },
      { type: 'text', i18n: 'exWavesFourier', hidden: true },
      { type: 'raw', content: 'taylor(periodic(x,-pi,pi), x=0, 10)' },
      { type: 'raw', content: 'plot([x, sum((-1)^(n+1)*2*sin(n*x)/n, n, 1, 5)], x=-pi..pi)' },
      { type: 'text', i18n: 'exWavesForced', hidden: true },
      { type: 'raw', content: 'desolve(y\'\' + 0.2*y\' + 4*y = cos(t), y)' },
      { type: 'raw', content: 'desolve(y\'\' + 0.2*y\' + 4*y = cos(2*t), y)' }
    ]
  },

  'signal-processing': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exSignalTitle', hidden: true },
      { type: 'text', i18n: 'exSignalLaplace', hidden: true },
      { type: 'raw', content: 'laplace(1, t, s)' },
      { type: 'raw', content: 'laplace(t, t, s)' },
      { type: 'raw', content: 'laplace(t^2, t, s)' },
      { type: 'raw', content: 'laplace(exp(-2*t), t, s)' },
      { type: 'raw', content: 'laplace(sin(3*t), t, s)' },
      { type: 'raw', content: 'laplace(cos(3*t), t, s)' },
      { type: 'raw', content: 'laplace(exp(-2*t)*sin(3*t), t, s)' },
      { type: 'text', i18n: 'exSignalILaplace', hidden: true },
      { type: 'raw', content: 'ilaplace(1/s, s, t)' },
      { type: 'raw', content: 'ilaplace(1/(s+2), s, t)' },
      { type: 'raw', content: 'ilaplace(1/s^2, s, t)' },
      { type: 'raw', content: 'ilaplace(3/(s^2+9), s, t)' },
      { type: 'raw', content: 'ilaplace(1/((s+1)*(s+2)), s, t)' },
      { type: 'text', i18n: 'exSignalTransfer', hidden: true },
      { type: 'raw', content: 'H := 1/(s^2 + s + 1)' },
      { type: 'raw', content: 'partfrac(H)' },
      { type: 'raw', content: 'ilaplace(H, s, t)' },
      { type: 'raw', content: 'ilaplace(H/s, s, t)' },
      { type: 'text', i18n: 'exSignalZtrans', hidden: true },
      { type: 'raw', content: 'ztrans(1, n, z)' },
      { type: 'raw', content: 'ztrans(n, n, z)' },
      { type: 'raw', content: 'ztrans((1/2)^n, n, z)' },
      { type: 'raw', content: 'ztrans(n*(1/2)^n, n, z)' },
      { type: 'text', i18n: 'exSignalIZtrans', hidden: true },
      { type: 'raw', content: 'invztrans(z/(z-1), z, n)' },
      { type: 'raw', content: 'invztrans(z/(z-1/2), z, n)' },
      { type: 'raw', content: 'invztrans(z/(z-1)^2, z, n)' },
      { type: 'text', i18n: 'exSignalRoundtrip', hidden: true },
      { type: 'raw', content: 'simplify(ilaplace(laplace(exp(-2*t)*cos(3*t), t, s), s, t))' },
      { type: 'raw', content: 'simplify(invztrans(ztrans((1/2)^n, n, z), z, n))' }
    ]
  },
  'quadratic-equation': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exQuadTitle', suffix: '\n\n@bind(a, -5, 5, 0.1, 1, "sliderCoeffA")\n@bind(b, -10, 10, 0.1, -3, "sliderCoeffB")\n@bind(c, -10, 10, 0.1, 2, "sliderCoeffC")', hidden: true },
      { type: 'text', i18n: 'exQuadDiscriminant', hidden: true },
      { type: 'raw', content: 'Delta := b^2 - 4*a*c' },
      { type: 'text', i18n: 'exQuadRoots', hidden: true },
      { type: 'raw', content: 'solve(a*x^2 + b*x + c = 0, x)' },
      { type: 'text', i18n: 'exQuadVertex', hidden: true },
      { type: 'raw', content: '-b/(2*a)' },
      { type: 'raw', content: 'a*(-b/(2*a))^2 + b*(-b/(2*a)) + c' },
      { type: 'text', i18n: 'exQuadFactored', hidden: true },
      { type: 'raw', content: 'factor(a*x^2 + b*x + c)' },
      { type: 'text', i18n: 'exQuadGraph', hidden: true },
      { type: 'raw', content: 'plot(a*x^2 + b*x + c, x=-10..10)' },
      { type: 'text', content: '@bind(a, -5, 5, 0.1, 1, "sliderCoeffA")\n@bind(b, -10, 10, 0.1, -3, "sliderCoeffB")\n@bind(c, -10, 10, 0.1, 2, "sliderCoeffC")' }
    ]
  },
  'amplitude-modulation': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exAMTitle', suffix: '\n\n@bind(fc, 1, 20, 0.5, 5, "sliderCarrierFreq")\n@bind(fm, 0.1, 5, 0.1, 1, "sliderModFreq")\n@bind(m, 0, 1, 0.01, 0.5, "sliderModDepth")', hidden: true },
      { type: 'raw', content: 'plot(sin(2*pi*fc*x)*(1+m*sin(2*pi*fm*x)), x=0..2)' }
    ]
  },
  'frequency-modulation': {
    version: 2, reactiveMode: true,
    cells: [
      { type: 'text', i18n: 'exFMTitle', suffix: '\n\n@bind(fc, 1, 20, 0.5, 5, "sliderCarrierFreq")\n@bind(fm, 0.1, 5, 0.1, 1, "sliderModFreq")\n@bind(beta, 0, 10, 0.1, 2, "sliderModIndex")', hidden: true },
      { type: 'raw', content: 'plot(sin(2*pi*fc*x+beta*sin(2*pi*fm*x)), x=0..2)' }
    ]
  }
};

var EXAMPLES = [
  { id: 'arithmetic',            i18nName: 'exampleArithmetic' },
  { id: 'algebra',               i18nName: 'exampleAlgebra' },
  { id: 'calculus',              i18nName: 'exampleCalculus' },
  { id: 'sums-series',           i18nName: 'exampleSumsSeries' },
  { id: 'linear-algebra',        i18nName: 'exampleLinearAlgebra' },
  { id: 'plots',                 i18nName: 'examplePlots' },
  { id: 'reactive-dag',          i18nName: 'exampleReactive' },
  { id: 'quadratic-equation',    i18nName: 'exampleQuadratic' },
  { id: 'amplitude-modulation',  i18nName: 'exampleAM' },
  { id: 'frequency-modulation',  i18nName: 'exampleFM' },
  { id: 'physics-mechanics',     i18nName: 'exampleMechanics' },
  { id: 'physics-waves',         i18nName: 'exampleWaves' },
  { id: 'signal-processing',     i18nName: 'exampleSignal' },
  { id: 'full-demo',             i18nName: 'exampleFullDemo' }
];

function loadExample(id) {
  var data = EXAMPLE_DATA[id];
  if (!data) return;
  if (cells.length > 0 && !confirm(t('loadExampleConfirm'))) return;
  // Resolve i18n keys in text cells; append @bind suffix if present
  var resolved = JSON.parse(JSON.stringify(data));
  resolved.cells.forEach(function(item) {
    if (item.i18n) {
      item.content = t(item.i18n) + (item.suffix || '');
      delete item.i18n;
      delete item.suffix;
    }
  });
  // If example has @bind directives, wait for Lit.js slider-param component
  var hasBinds = resolved.cells.some(function(c) {
    return c.type === 'text' && c.content && c.content.indexOf('@bind(') >= 0;
  });
  function doLoad() {
    try {
      loadNotebookData(resolved);
    } catch (err) {
      console.error('Failed to load example:', err);
      alert(err.message);
    }
  }
  if (hasBinds && window._litReady) {
    window._litReady.then(doLoad);
  } else {
    doLoad();
  }
  hideExamplesMenu();
}

function showExamplesMenu() {
  var existing = document.getElementById('examples-menu');
  if (existing) { hideExamplesMenu(); return; }
  var menu = document.createElement('div');
  menu.id = 'examples-menu';
  menu.className = 'examples-menu';
  EXAMPLES.forEach(function(ex) {
    var btn = document.createElement('button');
    btn.textContent = t(ex.i18nName);
    btn.onclick = function() { loadExample(ex.id); };
    menu.appendChild(btn);
  });
  var anchor = document.getElementById('examples-btn');
  if (anchor) {
    anchor.parentNode.style.position = 'relative';
    anchor.parentNode.appendChild(menu);
  }
  setTimeout(function() {
    document.addEventListener('click', _closeExamplesMenu);
  }, 0);
}

function hideExamplesMenu() {
  var menu = document.getElementById('examples-menu');
  if (menu) menu.remove();
  document.removeEventListener('click', _closeExamplesMenu);
}

function _closeExamplesMenu(e) {
  var menu = document.getElementById('examples-menu');
  var btn = document.getElementById('examples-btn');
  if (menu && !menu.contains(e.target) && e.target !== btn) {
    hideExamplesMenu();
  }
}
