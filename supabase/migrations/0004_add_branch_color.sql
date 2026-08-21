-- Отмечает человека как родоначальника отдельной ветки рода: цвет
-- наследуют все его кровные потомки (biological_parent/adoptive_parent/
-- foster_parent/guardian, любое число поколений) в дереве и на странице
-- человека. Супруги/партнёры цвет не наследуют и дальше не передают.
-- Кто из потомков какого цвета — не хранится нигде, кроме самого
-- родоначальника: вычисляется на лету, как siblings (CLAUDE.md 3.5).

alter table people
  add column branch_color text
  check (branch_color is null or branch_color ~ '^#[0-9a-fA-F]{6}$');
