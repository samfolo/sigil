# Sigil: AI-Native UI Generation Framework

## Vision
A system that maps data semantics to intelligent UI representations through a formal intermediate representation, enabling systematic component generation rather than ad-hoc hardcoded visualisations.

## Core Architecture

### Phase 1: Foundation (Current State)
- Format detection (JSON/CSV/YAML/XML)
- Basic semantic analysis
- Hardcoded visualisation routing
- Simple tool calling for data manipulation

### Phase 2: Component Specification System (Next)
- Define component spec IR schema
- Semantic field analysis (detect UUIDs, status enums, time series, etc.)
- Map semantics → component specs
- Store specs in database

### Phase 3: Code Generation & Execution
- LLM-based React component generation from specs
- Sandboxed iframe execution
- Component composition
- Real-time rendering

### Phase 4: Learning Loop
- User feedback (thumbs up/down)
- Successful spec storage with embeddings
- Retrieval of similar successful patterns
- Continuous improvement

## Component Spec IR Format
[To be designed - JSON schema defining component types, props, composition]

## Technical Requirements
- CodeMirror for input
- Proper error boundaries
- Testing strategy for stochastic components
- Model configuration UI
- Security: sandboxed execution, input validation

## Success Metrics
- Can generate functional UIs for 80% of common data types
- User feedback positive on generated components
- System improves over time via learning loop
