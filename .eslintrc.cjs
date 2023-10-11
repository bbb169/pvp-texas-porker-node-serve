module.exports = {
    // 指定代码的运行环境。
    env: {
        es2020: true,
        node: true,
        browser: true,
    },
    settings: {
    // 自动检测React的版本，从而进行规范代码。
        react: {
            pragma: 'React',
            version: 'detect',
        },
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/recommended',
    ],
    parser: '@typescript-eslint/parser', // 解析 TypeScript 代码
    parserOptions: {
        parser: '@babel/eslint-parser', // 指定 eslint 可以解析 JSX 语法。
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
    },
    plugins: ['react-refresh', '@typescript-eslint', 'eslint-plugin-import', 'eslint-plugin-react', 'react'],
    rules: {
        'no-cond-assign': 'error',
        '@typescript-eslint/no-use-before-define':'off',
        '@typescript-eslintno-empty-interface':'off',
        '@typescript-eslint/camelcase': 'off',
        // 禁止在定义对象时将对象的key用引号包起来
        'quote-props': ['error', 'as-needed', { numbers: true }],
        // 禁止{some:some}
        'object-shorthand': ['error'],
        // 禁止new Object()
        'no-new-object': ['error'],
        // 禁止用var
        'no-var': ['error'],
        // 禁止用 new Array()
        'no-array-constructor': ['error'],
        // 推荐用单引号
        quotes: [1, 'single'],
        // 尽量使用模板字符串
        'prefer-template': [1],
        // 模板字符串空格
        'template-curly-spacing': [1],
        // 字符串内禁止出现非法转义字符
        'no-useless-escape': ['error'],
        
        // 推荐使用function foo(){} 不推荐使用constfoo=function(){}
        'func-style': [1, 'declaration', { allowArrowFunctions: true }],
        // 立即执行表达式必须用圆括号包裹
        'wrap-iife': ['error'],
        // 禁止使用Object.assign 应该使用{...obj}
        'prefer-rest-params': ['error'],
        // 禁止使用new Function
        'no-new-func': ['error'],
        // 在函数参数有多行时参数向前对齐
        'function-paren-newline': ['error', 'multiline'],
        // 禁止有多个相同module的import
        'no-duplicate-imports': ['error'],
        // 禁止从一个module中导入多次
        'import/no-mutable-exports': [1],
        // 在回调函数中使用箭头函数
        'prefer-arrow-callback': ['error'],
        // 箭头函数没有括号的情况下禁止出现>= 和<=
        'no-confusing-arrow': ['error'],
        // 禁止在同一个对象中出现相同的key
        'no-dupe-class-members': ['error'],
        // 禁止使用foreach for of 应该使用[].foreach代替
        'no-iterator': ['error'],
        // 禁止用obj['key'] 必须使用obj.key
        'dot-notation': ['error'],
        // 禁止用一个let/const 定义多个变量
        'one-var': ['error', 'never'],
        // 禁止使用连等 let a=b=c=1
        'no-multi-assign': ['error'],
        'operator-linebreak': [1],
        // 禁止不必要的三目表达式 如a?true:false
        'no-unneeded-ternary': [1],
        // 在一行中写复杂表达式时要用括号包起来表名执行序
        'no-mixed-operators': ['error'],
        // 禁止if在不写大括号时换行写内容
        'nonblock-statement-body-position':['error'],
        // 禁止左括号换行
        'brace-style': ['error'],
        // 在if中return后不要写else
        'no-else-return': ['error'],
        // 链式调用每行一个
        'newline-per-chained-call': ['error', { ignoreChainWithDepth: 3 }],
        // 禁止出现长度小于2的标识符
        'id-length': ['error', { exceptions:['x', 'y', 'i', 'j', 'e', 'a', 'b'] }],
        // 在块作用域内上下禁止留空行
        'padded-blocks': [1, 'never'],
        // 禁止连续的空行
        'no-multiple-empty-lines': [1],
        // 禁止直接修改state
        'react/no-direct-mutation-state': ['error'],
        // 写列表必须要写key
        'react/jsx-key': ['error'],
        '@typescript-eslint/ban-ts-ignore': 'off',
        'react/jsx-max-props-per-line': ['error', { maximum: 4, when: 'always' }],
        'react/forbid-elements': ['off'],
        'arrow-spacing': ['error', { before: true, after: true }],
        indent: ['error', 4, { SwitchCase: 1, ignoredNodes: ['JSXAttribute'] }],
        'react/jsx-indent-props': ['error', 4],
        // "react/jsx-indent": "error",
        'no-unused-vars': ['error', { varsIgnorePattern: '' }],
        'no-shadow': ['off'],
        'no-undef': ['error'],
        'no-debugger': ['error'],
        'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.tsx'] }],
        'import/first': 'off',
        'import/prefer-default-export': ['off'],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'max-statements': ['error', 100],
        // 要求或禁止使用分号而不是 ASI（这个才是控制尾部分号的，）
        semi: [2, 'always'],
        // 强制分号之前和之后使用一致的空格
        'semi-spacing': 0,
        // 要求同一个声明块中的变量按顺序排列
        'sort-vars': 0,
        // 强制在块之前使用一致的空格
        'space-before-blocks': [2, 'always'],
        // 强制在 function的左括号之前使用一致的空格
        'space-before-function-paren': [2, 'always'],
        // 强制在圆括号内使用一致的空格
        'space-in-parens': [2, 'never'],
        // 要求操作符周围有空格
        'space-infix-ops': 2,
        // 强制在一元操作符前后使用一致的空格
        'space-unary-ops': [2, { words: true, nonwords: false }],
        // 强制在注释中 // 或 /* 使用一致的空格
        'spaced-comment': [
            'error', 'always', {
                line: {
                    markers: ['/', 'eslint-disable'],
                    exceptions: ['-', '+'],
                },
                block: {
                    markers: ['!'],
                    exceptions: ['*'],
                    balanced: true,
                },
            },
        ],
        // 要求或禁止 Unicode BOM
        'unicode-bom': 1,
        //  要求正则表达式被括号括起来
        'wrap-regex': 0,
        // 要求逗号后面必须加上空格
        'comma-spacing': [2, { before: false, after: true }],
        // 要求使用3个等于号
        eqeqeq: 1,
        // 禁止object对象出现换行，或者换行后仅允许一存在
        'object-curly-newline': [
            'error', {
                ObjectExpression: { multiline: true },
                ObjectPattern: { multiline: true },
                ImportDeclaration: 'never',
                ExportDeclaration: { multiline: true, minProperties: 3 },
            },
        ],
        'object-curly-spacing': ['error', 'always'],
        // 要求多行数组/对象最后一个元素后面需要加上号 防止在下次修改添加元素时污染上一行的git log
        'comma-dangle': [
            'error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'ignore',
                exports: 'ignore',
                functions: 'ignore',
            },
        ],
        'react/react-in-jsx-scope': 0,
        'react/no-unknown-property': 0,
    },
};
