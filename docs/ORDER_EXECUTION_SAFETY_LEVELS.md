cd C:\Users\delor\OneDrive\Documents\optima-dashboard

@'
# Order Execution Safety Levels

## Purpose

This document defines the safe path from trade alerts to possible order execution.

The goal is to prevent one dangerous mistake:

```txt
Approve Alert
→ Accidentally Place Real Order