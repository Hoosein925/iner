import { StaffMember, SkillItem } from '../types';

export const generateImprovementPlan = (
    staff: StaffMember,
    weakSkillsByCategory: { categoryName: string; skills: SkillItem[] }[],
    supervisorMessage?: string,
    managerMessage?: string
): string => {
  const allWeakSkills = weakSkillsByCategory.flatMap(category => 
    category.skills.map(skill => ({ description: skill.description, category: category.categoryName }))
  );

  if (allWeakSkills.length === 0) {
    return "هیچ نقطه ضعفی برای ایجاد برنامه یافت نشد.";
  }

  // Section 1: List of skills to improve
  const skillList = weakSkillsByCategory
    .filter(cat => cat.skills.length > 0)
    .map(category => {
      const skills = category.skills.map(skill => `- ${skill.description}`).join('\n');
      return `**${category.categoryName}**\n${skills}`;
    })
    .join('\n\n');

  // Section 2: 30-day study plan
  let studyPlan = '';
  for (let i = 0; i < 30; i++) {
    const skillToStudy = allWeakSkills[i % allWeakSkills.length];
    studyPlan += `**روز ${i + 1}:** مطالعه و تمرین در مورد "${skillToStudy.description}" (از دسته ${skillToStudy.category})\n`;
  }
  
  const plan = `
**${staff.name} عزیز**، طبق نتایج استخراج شده از آخرین ارزیابی شما، برنامه آموزشی پیشنهادی به شرح زیر می‌باشد.

\n

**موارد نیازمند بهبود**

${skillList}

\n\n

**برنامه مطالعه ماه پیش رو**

در ماه پیش رو، پیشنهاد می‌شود طبق جدول زمان‌بندی زیر بر روی موارد مشخص شده تمرکز کنید:

${studyPlan}
`;

  let finalPlan = plan.trim();

  if (supervisorMessage && supervisorMessage.trim()) {
    finalPlan += `
\n\n---
\n\n**پیام سوپروایزر آموزشی:**\n\n<QUOTE>${supervisorMessage}</QUOTE>
`;
  }

  if (managerMessage && managerMessage.trim()) {
    finalPlan += `
\n\n---
\n\n**پیام مسئول بخش:**\n\n<QUOTE>${managerMessage}</QUOTE>
`;
  }

  return finalPlan;
};