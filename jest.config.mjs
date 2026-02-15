export default {
    testEnvironment: 'node',
    transform: {},
    verbose: true,
    roots: ['./tests'],
    collectCoverageFrom: [
        'src/**/*.mjs',
        '!src/data/**',
        '!**/node_modules/**'
    ],
    coverageThreshold: {
        global: {
            branches: 5,
            functions: 5,
            lines: 5,
            statements: 5
        }
    },
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    clearMocks: true,
    testTimeout: 10000
}
