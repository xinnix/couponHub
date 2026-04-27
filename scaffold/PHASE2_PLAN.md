# Phase 2 实施计划 - genModule Skill 智能化升级

## 🎯 目标

将 genModule Skill 从基础代码生成器（777 行）升级为智能 AI 助手（1000+ 行）

**核心价值**：
- 智能字段推断：自动识别 price → currency UI，email → email 验证
- 关系自动生成：categoryId → Category relation + Select
- UI 模式智能选择：富文本 → 分离式页面，状态机 → 详情页强化
- 验证规则自动生成：从配置生成 Zod Schema

---

## 📋 实施步骤

### Step 1: 智能字段推断实现（Day 1-2）

**文件**: `.claude/skills/genModule/scripts/field-inference.ts`

**核心功能**:
```typescript
// 1. 定义字段推断规则
export const FIELD_INFERENCE_RULES = {
  currency: {
    patterns: ['price', 'amount', 'cost', 'fee', 'total', 'payment'],
    type: 'Float',
    validation: 'min:0',
    uiComponent: 'InputNumber',
    uiProps: {
      formatter: value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      precision: 2
    }
  },
  dateRange: {
    patterns: ['startDate', 'endDate', 'beginAt', 'finishAt', 'from', 'to'],
    type: 'DateTime',
    validation: 'required',
    uiComponent: 'DatePicker',
    features: ['range-validation']
  },
  slug: {
    patterns: ['slug', 'code', 'alias'],
    type: 'String',
    validation: 'unique',
    autoGenerate: true,
    generator: 'name-to-slug'
  },
  email: {
    patterns: ['email', 'mail'],
    type: 'String',
    validation: 'email|unique',
    uiComponent: 'Input',
    uiProps: { type: 'email' }
  },
  phone: {
    patterns: ['phone', 'mobile', 'telephone'],
    type: 'String',
    validation: 'phone',
    uiComponent: 'Input',
    uiProps: { type: 'tel' }
  },
  audit: {
    patterns: ['createdById', 'updatedById'],
    type: 'String',
    autoInject: true,
    hideInForm: true,
    showInDetail: false
  }
};

// 2. 字段推断函数
export function inferFieldType(fieldName: string): FieldConfig | null {
  for (const [ruleName, rule] of Object.entries(FIELD_INFERENCE_RULES)) {
    if (rule.patterns.some(pattern => fieldName.toLowerCase().includes(pattern))) {
      return {
        name: fieldName,
        type: rule.type,
        validation: rule.validation,
        uiComponent: rule.uiComponent,
        uiProps: rule.uiProps,
        autoInject: rule.autoInject,
        hideInForm: rule.hideInForm,
        ...rule
      };
    }
  }
  return null;
}
```

**测试验证**:
```typescript
// 测试用例
test('字段推断 - price', () => {
  const result = inferFieldType('price');
  expect(result.type).toBe('Float');
  expect(result.uiComponent).toBe('InputNumber');
  expect(result.validation).toContain('min:0');
});

test('字段推断 - email', () => {
  const result = inferFieldType('email');
  expect(result.type).toBe('String');
  expect(result.validation).toContain('email');
});
```

---

### Step 2: 关系字段自动生成（Day 3-4）

**文件**: `.claude/skills/genModule/scripts/relation-generator.ts`

**核心功能**:
```typescript
export interface RelationField {
  field: string;           // 字段名（如 categoryId）
  model: string;           // 关联模型（如 Category）
  type: 'belongsTo' | 'hasMany' | 'hasOne';
  uiComponent: string;     // UI 组件（Select、TreeSelect、UserSelect）
  uiProps?: any;           // UI 配置
}

export function detectRelationFields(
  moduleName: string,
  patterns: any
): RelationField[] {
  const relations = [];

  // 检测 categoryId → Category relation
  if (patterns.defaultFields.some(f => f.name === 'categoryId')) {
    relations.push({
      field: 'categoryId',
      model: 'Category',
      type: 'belongsTo',
      uiComponent: 'Select',
      uiProps: {
        showSearch: true,
        filterOption: (input, option) =>
          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    });
  }

  // 检测 userId → User relation
  if (patterns.defaultFields.some(f => f.name === 'userId')) {
    relations.push({
      field: 'userId',
      model: 'User',
      type: 'belongsTo',
      uiComponent: 'UserSelect'
    });
  }

  // 检测 parentId → self relation（树形结构）
  if (patterns.defaultFields.some(f => f.name === 'parentId')) {
    relations.push({
      field: 'parentId',
      model: moduleName,
      type: 'belongsTo',
      uiComponent: 'TreeSelect',
      uiProps: {
        treeData: [],  // 从数据加载
        placeholder: '选择父级'
      }
    });
  }

  // 检测 authorId → User relation
  if (patterns.defaultFields.some(f => f.name === 'authorId')) {
    relations.push({
      field: 'authorId',
      model: 'User',
      type: 'belongsTo',
      uiComponent: 'UserSelect'
    });
  }

  return relations;
}

// 生成关系字段 UI 代码
export function generateRelationFieldUI(relation: RelationField): string {
  if (relation.uiComponent === 'Select') {
    return `
      <Form.Item
        label="${relation.field.replace('Id', '')}"
        name="${relation.field}"
        rules={[{ required: true, message: '请选择${relation.model}' }]}
      >
        <Select
          showSearch
          placeholder="选择${relation.model}"
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {/* TODO: 从 API 加载 ${relation.model} 列表 */}
        </Select>
      </Form.Item>
    `;
  }

  if (relation.uiComponent === 'TreeSelect') {
    return `
      <Form.Item
        label="父级"
        name="${relation.field}"
      >
        <TreeSelect
          placeholder="选择父级"
          treeData={treeData}
          allowClear
        />
      </Form.Item>
    `;
  }

  return '';
}
```

**测试验证**:
```typescript
test('关系生成 - categoryId', () => {
  const patterns = {
    defaultFields: [{ name: 'categoryId' }]
  };
  const relations = detectRelationFields('Product', patterns);
  expect(relations).toHaveLength(1);
  expect(relations[0].model).toBe('Category');
  expect(relations[0].uiComponent).toBe('Select');
});

test('关系生成 - parentId（树形）', () => {
  const patterns = {
    defaultFields: [{ name: 'parentId' }]
  };
  const relations = detectRelationFields('Category', patterns);
  expect(relations).toHaveLength(1);
  expect(relations[0].model).toBe('Category');
  expect(relations[0].uiComponent).toBe('TreeSelect');
});
```

---

### Step 3: UI 模式智能选择（Day 5）

**文件**: `.claude/skills/genModule/scripts/ui-pattern-selector.ts`

**核心功能**:
```typescript
export interface UIPattern {
  pattern: 'modal' | 'separate' | 'drawer';
  pages: string[];
  reason: string;
  detailPageFeatures?: string[];
  listFeatures?: string[];
}

export function selectUIPattern(
  moduleName: string,
  patterns: any
): UIPattern {
  // 富文本字段 → 分离式页面
  if (patterns.defaultFields.some(f => f.ui === 'rich-text-editor')) {
    return {
      pattern: 'separate',
      pages: ['ListPage', 'CreatePage', 'EditPage', 'DetailPage'],
      reason: '富文本编辑器不适合 Modal，需要独立页面',
      detailPageFeatures: ['rich-text-display']
    };
  }

  // 状态机字段 → 详情页强化
  if (patterns.stateMachine) {
    return {
      pattern: 'modal',
      pages: ['ListPage', 'DetailPage'],
      reason: '状态机需要在详情页展示流转历史',
      detailPageFeatures: ['state-flow-diagram', 'timeline', 'action-buttons']
    };
  }

  // 树形结构 → 树形选择器
  if (patterns.selfRelation) {
    return {
      pattern: 'modal',
      pages: ['ListPage'],
      reason: '树形结构需要特殊的展示和排序方式',
      listFeatures: ['tree-table', 'drag-sort']
    };
  }

  // 多图上传 → Modal 模式
  if (patterns.defaultFields.some(f => f.name === 'images' || f.name === 'gallery')) {
    return {
      pattern: 'modal',
      pages: ['ListPage'],
      reason: '多图上传适合 Modal 快速编辑'
    };
  }

  // 默认 Modal 模式（最简洁）
  return {
    pattern: 'modal',
    pages: ['ListPage'],
    reason: 'Modal 模式最简洁，适合简单 CRUD'
  };
}
```

**测试验证**:
```typescript
test('UI 模式选择 - 富文本', () => {
  const patterns = {
    defaultFields: [{ name: 'content', ui: 'rich-text-editor' }]
  };
  const result = selectUIPattern('News', patterns);
  expect(result.pattern).toBe('separate');
  expect(result.pages).toContain('CreatePage');
});

test('UI 模式选择 - 状态机', () => {
  const patterns = {
    stateMachine: true
  };
  const result = selectUIPattern('Order', patterns);
  expect(result.pattern).toBe('modal');
  expect(result.detailPageFeatures).toContain('state-flow-diagram');
});
```

---

### Step 4: 验证规则智能生成（Day 6）

**文件**: `.claude/skills/genModule/scripts/validation-generator.ts`

**核心功能**:
```typescript
export function generateValidationRules(field: FieldConfig): string {
  const rules = [];

  // 基础类型验证
  if (field.type === 'String') {
    if (field.validation.includes('required')) {
      rules.push('z.string().min(1, "不能为空")');
    } else {
      rules.push('z.string().nullable().optional()');
    }
  } else if (field.type === 'Int' || field.type === 'Float') {
    rules.push('z.number()');
    if (field.validation.includes('min:0')) {
      rules.push('.min(0, "不能小于0")');
    }
  } else if (field.type === 'Boolean') {
    rules.push('z.boolean()');
  } else if (field.type === 'DateTime') {
    rules.push('z.date()');
  }

  // 长度验证
  if (field.validation.includes('min:')) {
    const min = field.validation.match(/min:(\d+)/)?.[1];
    if (min) {
      rules.push(`.min(${min}, "长度不能小于${min}")`);
    }
  }
  if (field.validation.includes('max:')) {
    const max = field.validation.match(/max:(\d+)/)?.[1];
    if (max) {
      rules.push(`.max(${max}, "长度不能超过${max}")`);
    }
  }

  // 格式验证
  if (field.validation.includes('email')) {
    rules.push('.email("邮箱格式不正确")');
  }
  if (field.validation.includes('phone')) {
    rules.push('.regex(/^1[3-9]\\d{9}$/, "手机号格式不正确")');
  }
  if (field.validation.includes('url')) {
    rules.push('.url("URL格式不正确")');
  }

  return rules.join('');
}

// 生成 Zod Schema
export function generateZodSchema(fields: FieldConfig[]): string {
  const schemaLines = fields.map(field => {
    const validation = generateValidationRules(field);
    return `  ${field.name}: ${validation},`;
  });

  return `
export const Create${moduleName}Schema = z.object({
${schemaLines.join('\n')}
});
`;
}
```

---

### Step 5: /analyze Skill 开发（Day 7-8）

**文件**: `.claude/skills/analyze/analyze.ts`

**核心功能**:
```typescript
export async function analyzeModule(moduleName: string): Promise<AnalysisReport> {
  // 1. 读取模块文件
  const files = await readModuleFiles(moduleName);

  // 2. 分析 Service 模式
  const servicePatterns = extractServicePatterns(files.service);

  // 3. 分析 Router 模式
  const routerPatterns = extractRouterPatterns(files.router);

  // 4. 分析 UI 模式
  const uiPatterns = extractUIPatterns(files.ui);

  // 5. 识别重构机会
  const refactorOpportunities = identifyRefactorOpportunities({
    service: servicePatterns,
    router: routerPatterns,
    ui: uiPatterns
  });

  return {
    moduleName,
    patterns: {
      service: servicePatterns,
      router: routerPatterns,
      ui: uiPatterns
    },
    refactorOpportunities,
    suggestions: [
      '可以抽象成 BaseService 扩展',
      '可以使用 createCrudRouter 简化',
      'UI 可以使用 StandardListPage 模板'
    ],
    reusableComponents: [
      'PermissionGuard',
      'OSSUpload',
      'RichTextEditor'
    ]
  };
}
```

---

### Step 6: /refactor Skill 开发（Day 9-10）

**文件**: `.claude/skills/refactor/refactor.ts`

**核心功能**:
```typescript
export async function refactorModule(moduleName: string): Promise<RefactorReport> {
  // 1. 分析模块
  const analysis = await analyzeModule(moduleName);

  // 2. 识别重构点
  const refactorPoints = identifyRefactorPoints(analysis);

  // 3. 重构 Service → 继承 BaseService
  if (refactorPoints.service.canUseBaseService) {
    await refactorServiceToBaseService(moduleName);
  }

  // 4. 重构 Router → 使用 createCrudRouter
  if (refactorPoints.router.canUseCrudRouter) {
    await refactorRouterToCrudRouter(moduleName);
  }

  // 5. 重构 UI → 使用 Standard 组件
  if (refactorPoints.ui.canUseStandardComponents) {
    await refactorUIToStandardComponents(moduleName);
  }

  // 6. 生成重构报告
  return {
    before: {
      linesOfCode: analysis.totalLines,
      complexity: analysis.complexityScore
    },
    after: {
      linesOfCode: estimateRefactoredLines(refactorPoints),
      complexity: 'low'
    },
    improvements: [
      '减少重复代码 80%',
      '提升类型安全性',
      '统一代码风格'
    ]
  };
}
```

---

## ✅ 验证方式

### 1. genModule 智能化验证

```bash
# 运行生成命令
/genModule product

# 验证生成的模块包含：
# - price 字段自动使用 currency UI
# - categoryId 字段自动生成 Category relation + Select
# - 验证规则自动生成（min:0）
# - UI 模式自动选择（Modal）
```

### 2. analyze/refactor 验证

```bash
# 分析现有模块
/analyze merchant

# 验证生成分析报告：
# - 识别可重构的部分
# - 提供重构建议

# 重构模块
/refactor merchant

# 验证重构结果：
# - Service 继承 BaseService
# - Router 使用 createCrudRouter
# - UI 代码减少 80%
```

---

## 📊 Phase 2 预计成果

| 功能 | 当前 | Phase 2 后 | 提升 |
|------|------|-----------|------|
| genModule 代码量 | 777 行 | 1000+ 行 | +223 行智能化逻辑 |
| 字段推断 | 手动配置 | 自动推断 | **零配置** ⭐ |
| 关系生成 | 手动编码 | 自动生成 | **零编码** ⭐ |
| UI 模式选择 | 固定 Modal | 智能选择 | **自动适配** ⭐ |
| 新增 Skills | 0 | 5 个 | analyze/refactor/test-gen/docs-gen/migrate |

---

## 🚀 Phase 2 启动时间

**启动日期**: 2026-04-27（立即开始）

**预计完成**: 2026-05-11（2 周后）