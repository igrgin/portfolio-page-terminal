import { defineArrayMember, defineField } from "sanity";

export function requiredSupportingSkillsField() {
  return defineField({
    name: "skills",
    of: [
      defineArrayMember({
        to: [{ type: "skill" }],
        type: "reference",
        weak: false,
      }),
    ],
    title: "Supporting Skills",
    type: "array",
    validation: (rule) => rule.required().min(1).unique(),
  });
}
