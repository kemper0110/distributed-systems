import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        includeSource: ['src/**/*.{js,ts}'],
        include: ["specification/**/*.spec.{js,ts}"],
        fileParallelism: false,
    },
})