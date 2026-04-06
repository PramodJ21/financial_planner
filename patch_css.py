import os
import re

filepath = r"d:\Pramod\financial_planner\frontend\src\index.css"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make padding top larger, bottom smaller
content = content.replace("padding: 22px 56px 22px 44px;", "padding: 32px 56px 12px 44px;")
content = content.replace("padding: 18px 50px 18px 38px;", "padding: 28px 50px 8px 38px;")
content = content.replace("padding: 14px 36px 14px 28px;", "padding: 26px 36px 6px 28px;")
content = content.replace("padding: 14px 52px 14px 40px;", "padding: 24px 52px 4px 40px;")
content = content.replace("padding: 10px 44px 10px 34px;", "padding: 24px 44px 0px 34px;")
content = content.replace("padding: 8px 28px 8px 22px;", "padding: 20px 28px 0px 22px;")

# Tier 1 inject
t1_inject = """  .proj-track {
    margin-bottom: 24px;
  }

  .profile-greeting { font-size: 60px; margin-bottom: 4px; }
  .archetype-card { padding: 30px 40px; margin-bottom: 30px; }
  .arch-name { font-size: 36px; margin-bottom: 4px; }
  .arch-desc { margin-bottom: 8px; line-height: 1.5; }
  .journey-card { padding: 14px 16px; gap: 14px; }
  .journey-card-value { font-size: 26px; }
"""
content = content.replace("  .proj-track {\n    margin-bottom: 24px;\n  }", t1_inject)

# Tier 2 inject
t2_inject = """  .cf-footnote {
    margin-top: 16px;
    padding-top: 14px;
    font-size: 13px;
  }

  .profile-greeting { font-size: 52px; margin-bottom: 4px; }
  .pmeta-pill { font-size: 11px; }
  .archetype-card { padding: 24px 32px; gap: 24px; margin-bottom: 24px; }
  .arch-name { font-size: 32px; margin-bottom: 4px; }
  .arch-desc { font-size: 13px; margin-bottom: 6px; line-height: 1.5; }
  .arch-traits { margin-bottom: 12px; }
  .journey-card { padding: 12px 14px; gap: 12px; }
  .journey-card-value { font-size: 24px; }
  .journey-card-label { font-size: 9px; }
  .journey-card-icon { width: 36px; height: 36px; font-size: 18px; }
"""
content = content.replace("  .cf-footnote {\n    margin-top: 16px;\n    padding-top: 14px;\n    font-size: 13px;\n  }", t2_inject)

# Tier 3 inject
t3_inject = """  .cf-footnote {
    margin-top: 12px;
    padding-top: 12px;
    font-size: 12px;
  }

  .profile-greeting { font-size: 44px; margin-bottom: 2px; }
  .pmeta-pill { font-size: 10px; }
  .archetype-card { padding: 20px 24px; gap: 20px; margin-bottom: 20px; }
  .arch-name { font-size: 28px; margin-bottom: 2px; }
  .arch-desc { font-size: 12px; margin-bottom: 4px; line-height: 1.4; }
  .arch-animal { font-size: 64px; }
  .arch-traits { margin-bottom: 8px; }
  .arch-trait { padding: 2px 8px; font-size: 9px; }
  .journey-card { padding: 10px 12px; gap: 10px; }
  .journey-card-value { font-size: 20px; }
  .journey-card-label { font-size: 8px; }
  .journey-card-icon { width: 32px; height: 32px; font-size: 16px; }
"""
content = content.replace("  .cf-footnote {\n    margin-top: 12px;\n    padding-top: 12px;\n    font-size: 12px;\n  }", t3_inject)

# Short 1 inject
s1_inject = """  .proj-track {
    margin-bottom: 14px;
  }

  .profile-greeting { font-size: 52px; margin-bottom: 2px; }
  .archetype-card { padding: 20px 28px; gap: 24px; margin-bottom: 20px; }
  .arch-name { font-size: 32px; margin-bottom: 2px; }
  .arch-desc { font-size: 13px; line-height: 1.4; margin-bottom: 4px; }
  .journey-card { padding: 12px 14px; gap: 12px; }
  .journey-card-value { font-size: 24px; }
  .journey-card-icon { width: 36px; height: 36px; }
"""
content = content.replace("  .proj-track {\n    margin-bottom: 14px;\n  }", s1_inject)

# Short 2 inject
s2_inject = """  .cf-footnote {
    margin-top: 10px;
    padding-top: 10px;
    font-size: 12px;
  }

  .profile-greeting { font-size: 42px; margin-bottom: 2px; }
  .pmeta-pill { font-size: 11px; }
  .archetype-card { padding: 16px 24px; gap: 18px; margin-bottom: 16px; }
  .arch-name { font-size: 26px; margin-bottom: 2px; }
  .arch-desc { font-size: 12px; margin-bottom: 4px; line-height: 1.4; }
  .arch-traits { margin-bottom: 8px; }
  .arch-animal { font-size: 56px; }
  .journey-grid { gap: 12px; }
  .journey-card { padding: 10px 12px; gap: 10px; }
  .journey-card-value { font-size: 18px; line-height: 1; }
  .journey-card-label { font-size: 9px; }
  .journey-card-sub { font-size: 10px; }
  .journey-card-icon { width: 30px; height: 30px; font-size: 15px; }
"""
content = content.replace("  .cf-footnote {\n    margin-top: 10px;\n    padding-top: 10px;\n    font-size: 12px;\n  }", s2_inject)

# Short 3 inject
s3_inject = """  .cf-footnote {
    margin-top: 8px;
    padding-top: 8px;
    font-size: 11px;
  }

  .profile-greeting { font-size: 38px; margin-bottom: 0px; }
  .pmeta-pill { font-size: 10px; }
  .archetype-card { padding: 14px 20px; gap: 16px; margin-bottom: 14px; }
  .arch-name { font-size: 24px; margin-bottom: 0px; }
  .arch-desc { font-size: 11px; margin-bottom: 4px; line-height: 1.3; }
  .arch-animal { font-size: 48px; }
  .arch-traits { margin-bottom: 6px; }
  .arch-trait { padding: 2px 6px; font-size: 8px; }
  .journey-grid { gap: 10px; }
  .journey-card { padding: 8px 10px; gap: 8px; }
  .journey-card-value { font-size: 16px; line-height: 1;}
  .journey-card-label { font-size: 8px; }
  .journey-card-sub { font-size: 9px; }
  .journey-card-icon { width: 26px; height: 26px; font-size: 13px; }
"""
content = content.replace("  .cf-footnote {\n    margin-top: 8px;\n    padding-top: 8px;\n    font-size: 11px;\n  }", s3_inject)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated paddings and injected YourProfile scaling.")
