# Comprehensive Parameter Exploration Guide

This guide helps you efficiently explore the Snake AI parameter space to find optimal configurations without missing good combinations.

## 🚀 Quick Start Strategies

### Strategy 1: Fast Discovery (Recommended First Step)
**Goal**: Quickly identify promising parameter regions
**Time**: ~1-2 hours

```bash
# Start with adaptive sampling to find good regions
npm run sample -- --method adaptive --games 1000 --initialSamples 50 --refinementRounds 2

# Or use Latin Hypercube for broad coverage
npm run sample -- --method latin --samples 500 --games 1000
```

### Strategy 2: Deep Exploration
**Goal**: Comprehensive exploration of parameter space
**Time**: 6-12 hours

```bash
# Fine-grained shortcut tuning
npm run explore -- --strategy FINE_SHORTCUT_TUNING --games 1500

# Grid size impact analysis  
npm run explore -- --strategy GRID_SIZE_ANALYSIS --games 1000
```

### Strategy 3: Exhaustive Search
**Goal**: Leave no stone unturned
**Time**: 20+ hours

```bash
# High-resolution parameter mapping
npm run explore -- --strategy HIGH_RESOLUTION --games 2000

# Compare shortcuts enabled vs disabled
npm run explore -- --strategy SHORTCUTS_COMPARISON --games 1500
```

## 📊 Analysis and Optimization Workflow

### 1. Run Initial Exploration
```bash
# Start with adaptive sampling
npm run sample -- --method adaptive --games 1000
```

### 2. Analyze Results
```bash
# Find the best configurations
npm run analyze -- --file results/smart-sampling-adaptive-*.json --output analysis.json
```

### 3. Refine Around Best Results
Use the insights from analysis to create focused sweeps:
```bash
# Example: If analysis shows safetyBuffer 2-4 is optimal
npm run simulate:sweep -- \
  --games 2000 \
  --safetyBuffer 2:4:0.1 \
  --lateGameLock 0:6:0.5 \
  --minShortcutWindow 3:7:0.5 \
  --output refined-sweep.json
```

### 4. Final Validation
```bash
# Test top configurations with more games for confidence
npm run simulate -- --games 5000 --safetyBuffer 3.2 --lateGameLock 2 --minShortcutWindow 5 --details
```

## 🎯 Parameter Exploration Strategies

### Random Sampling
- **Best for**: Initial exploration, large parameter spaces
- **Pros**: Fast, covers diverse configurations
- **Cons**: May miss optimal regions
```bash
npm run sample -- --method random --samples 1000 --games 500
```

### Latin Hypercube Sampling  
- **Best for**: Systematic coverage with fewer samples
- **Pros**: Better space coverage than random
- **Cons**: Still statistical sampling
```bash
npm run sample -- --method latin --samples 500 --games 1000
```

### Adaptive Sampling (Recommended)
- **Best for**: Finding optimal configurations efficiently
- **Pros**: Focuses on promising regions, iterative refinement
- **Cons**: May converge to local optima
```bash
npm run sample -- --method adaptive --games 1500
```

### Grid Sampling
- **Best for**: Systematic exploration of smaller spaces
- **Pros**: Guaranteed coverage, reproducible
- **Cons**: Exponential growth with parameters
```bash
npm run explore -- --strategy FINE_SHORTCUT_TUNING --games 1000
```

## 🔧 Parameter Tuning Tips

### Safety Buffer (safetyBuffer)
- **Range**: 0.5 - 8.0
- **Effect**: Higher = more conservative shortcuts, safer but potentially slower
- **Sweet spot**: Usually 2.0 - 4.0

### Late Game Lock (lateGameLock)  
- **Range**: 0 - 15
- **Effect**: When to stop taking shortcuts near game end
- **Sweet spot**: Usually 0 - 6

### Min Shortcut Window (minShortcutWindow)
- **Range**: 1 - 12
- **Effect**: Minimum safe distance required for shortcuts
- **Sweet spot**: Usually 3 - 7

### Grid Size Impact
- **Smaller grids** (10x10, 12x12): More aggressive shortcuts work
- **Larger grids** (20x20+): More conservative approach needed

## 📈 Performance Optimization

### For Speed
```bash
# Use fewer games for initial exploration
--games 500

# Use smaller sample sizes
--samples 200

# Focus on one parameter at a time
npm run simulate:sweep -- --games 1000 --safetyBuffer 1:5:1 --lateGameLock 2 --minShortcutWindow 4
```

### For Accuracy
```bash
# Use more games per configuration
--games 2000

# Use larger sample sizes
--samples 1000

# Run multiple independent sweeps and compare
```

### For Comprehensive Coverage
```bash
# Combine multiple strategies
npm run sample -- --method latin --samples 500 --games 1000
npm run explore -- --strategy FINE_SHORTCUT_TUNING --games 1500
npm run sample -- --method adaptive --games 2000
```

## 🎮 Real-World Examples

### Finding the Perfect Config for 20x20 Grid
```bash
# 1. Initial broad sampling
npm run sample -- --method adaptive --games 1000

# 2. Analyze results
npm run analyze -- --file results/smart-sampling-adaptive-*.json

# 3. Fine-tune around best results (example values)
npm run simulate:sweep -- \
  --games 3000 \
  --safetyBuffer 2.5:3.5:0.1 \
  --lateGameLock 1:3:0.25 \
  --minShortcutWindow 4:6:0.25 \
  --output final-tuning.json

# 4. Validate top performer
npm run simulate -- --games 10000 --safetyBuffer 3.1 --lateGameLock 2 --minShortcutWindow 5 --details
```

### Comparing Different Grid Sizes
```bash
npm run explore -- --strategy GRID_SIZE_ANALYSIS --games 1500
npm run analyze -- --file results/comprehensive-sweep-*.json
```

### Multi-Objective Optimization
```bash
# Optimize for both speed and consistency
npm run sample -- --method adaptive --games 2000 --refinementRounds 4
```

## 🚨 Common Pitfalls

1. **Too few games per config**: Use at least 1000 games for reliable results
2. **Ignoring completion rate**: Always filter for >95% completion rate
3. **Local optima**: Use multiple sampling strategies to avoid getting stuck
4. **Overfitting**: Validate final configs with independent runs
5. **Parameter interactions**: Don't optimize parameters in isolation

## 💡 Pro Tips

1. **Start small**: Begin with 500 games, increase for final validation
2. **Use analysis tools**: Always analyze results to guide next steps
3. **Save intermediate results**: Don't lose progress on long runs
4. **Monitor system resources**: These runs can be CPU intensive
5. **Version control**: Keep track of which configurations you've tested

## 🎯 Expected Results

With comprehensive exploration, you should find configurations that achieve:
- **20x20 grid**: ~22,000-25,000 moves (vs ~400,000 without shortcuts)
- **16x16 grid**: ~14,000-17,000 moves 
- **24x24 grid**: ~32,000-38,000 moves

Remember: The goal is finding the configuration that works best for YOUR specific use case and grid size!