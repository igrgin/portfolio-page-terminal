import { defineArrayMember, defineField } from "sanity";

type SupportingSkillsFieldGroup = "shared";

export function requiredSupportingSkillsField(
  group?: SupportingSkillsFieldGroup,
) {
  return defineField({
    ...(group ? { group } : {}),
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
