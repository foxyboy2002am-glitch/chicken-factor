-- Chicken Factor official printed menu import (November 2026)
-- Idempotent: products/categories/variants are upserted by stable SKU/slug.
-- Prices are EGP. No branch-specific availability is assumed.
begin;

with seed(slug,name_ar,name_en,sort_order) as (values
('individual-meals','الوجبات الفردية','Individual Meals',1),
('family-meals','الوجبات العائلية','Family Meals',2),
('rice-meals','وجبات الرز','Rice Meals',3),
('drumstick-meals','وجبات الدبابيس','Drumstick Meals',4),
('strips-family','استربس فاميلي','Family Strips',5),
('sandwiches','السندوتشات','Sandwiches',6),
('chicken-burgers','ساندوتشات تشيكن برجر','Chicken Burgers',7),
('beef-burgers','ساندوتشات بيف برجر','Beef Burgers',8),
('extras','الإضافات','Extras',9),
('sauces','الصوصات','Sauces',10),
('drinks','المشروبات','Drinks',11),
('selected-pieces','قطع مختارة','Selected Chicken Pieces',12),
('wing-swaps','تبديل الأجنحة','Wing Substitutions',13)
)
insert into public.categories(name_ar,name_en,slug,sort_order,is_active)
select name_ar,name_en,slug,sort_order,true from seed
on conflict (slug) do update set
  name_ar=excluded.name_ar,name_en=excluded.name_en,
  sort_order=excluded.sort_order,is_active=true;

with seed(sku,category_slug,name_ar,name_en,description_ar) as (values
('CF-KIDS','individual-meals','وجبة الأطفال','Kids Meal','وجبة أطفال مع لعبة.'),
('CF-SNACK-BOX','individual-meals','سنك بوكس','Snack Box',''),
('CF-DINNER-BOX','individual-meals','دينر بوكس','Dinner Box',''),
('CF-SUPER-DINNER-BOX','individual-meals','سوبر دينر بوكس','Super Dinner Box',''),
('CF-FAMILY-MEAL','family-meals','فاميلي ميل','Family Meal',''),
('CF-FAMILY-BOX','family-meals','فاميلي بوكس','Family Box',''),
('CF-SUPER-FAMILY-BOX','family-meals','سوبر فاميلي بوكس','Super Family Box',''),
('CF-FAMILY-JUMBO','family-meals','فاميلي جامبو','Family Jumbo',''),
('CF-SUPER-FAMILY-JUMBO','family-meals','سوبر فاميلي جامبو','Super Family Jumbo',''),
('CF-RICE-MEAL','rice-meals','رايز ميل','Rice Meal',''),
('CF-RIZO','rice-meals','طبق ريزو','Rizo Rice',''),
('CF-CHEDDAR-STRIPS-RICE','rice-meals','شيدر استربس','Cheddar Strips Rice',''),
('CF-BUFFALO-STRIPS-RICE','rice-meals','بافلو استربس','Buffalo Strips Rice',''),
('CF-CHEESE-STRIPS','rice-meals','تشييز استربس','Cheese Strips',''),
('CF-DRUMSTICK-MEAL-1','drumstick-meals','وجبة دبوس 1','Drumstick Meal 1',''),
('CF-DRUMSTICK-MEAL-2','drumstick-meals','وجبة دبوس 2','Drumstick Meal 2',''),
('CF-STRIPS-FAMILY-10','strips-family','استربس فاميلي 10 قطع','Family Strips 10 Pieces',''),
('CF-STRIPS-FAMILY-15','strips-family','استربس فاميلي 15 قطعة','Family Strips 15 Pieces',''),
('CF-STRIPS-FAMILY-20','strips-family','استربس فاميلي 20 قطعة','Family Strips 20 Pieces',''),
('CF-WRAP-CHICKEN','sandwiches','راب تشيكن','Chicken Wrap',''),
('CF-TOASTER-ROLL','sandwiches','توستر رول','Toaster Roll',''),
('CF-MOZZARELLA-TWISTER','sandwiches','موزاريلا تويستر رول','Mozzarella Twister Roll',''),
('CF-BIG-FILLER','sandwiches','بيج فيلر','Big Filler',''),
('CF-CHICKEN-CLASSIC','sandwiches','تشيكن كلاسيك','Chicken Classic',''),
('CF-CHICKEN-TURKEY','sandwiches','تشيكن تركي','Chicken Turkey',''),
('CF-BACON-FACTORY','sandwiches','بيكون فاكتوري','Bacon Factory',''),
('CF-MOZZARELLA-FACTORY','sandwiches','موزاريلا فاكتوري','Mozzarella Factory',''),
('CF-ONION-FACTORY','sandwiches','أونيون فاكتوري','Onion Factory',''),
('CF-SUPER-FACTORY','sandwiches','سوبر فاكتوري','Super Factory',''),
('CF-FACTOR-CHEESE','sandwiches','فاكتور تشيز','Factor Cheese',''),
('CF-CHICKEN-BURGER-CLASSIC','chicken-burgers','كلاسيك تشيكن برجر','Classic Chicken Burger',''),
('CF-CHICKEN-BURGER-BBQ','chicken-burgers','باربيكيو تشيكن برجر','BBQ Chicken Burger',''),
('CF-CHICKEN-BURGER-RANCH','chicken-burgers','رانش تشيكن برجر','Ranch Chicken Burger',''),
('CF-CHICKEN-BURGER-BIG-CHEESY','chicken-burgers','بيج تشيزي تشيكن برجر','Big Cheesy Chicken Burger',''),
('CF-BEEF-BURGER-BIG-CHEESY','beef-burgers','بيج تشيزي بيف','Big Cheesy Beef Burger',''),
('CF-BEEF-BURGER-RANCH','beef-burgers','رانش بيف سنجل','Ranch Beef Burger',''),
('CF-BEEF-BURGER-BBQ','beef-burgers','باربيكيو بيف سنجل','BBQ Beef Burger',''),
('CF-BEEF-BURGER-CLASSIC','beef-burgers','كلاسيك بيف سنجل','Classic Beef Burger',''),
('CF-BEEF-BURGER-CHEDDAR','beef-burgers','شيدر بيف سنجل','Cheddar Beef Burger',''),
('CF-FRIES','extras','باكيت بطاطس','French Fries',''),
('CF-GARLIC-SALAD','extras','سلطة ثومية','Garlic Sauce Salad',''),
('CF-COLESLAW','extras','سلطة كول سلو','Coleslaw',''),
('CF-ADD-2-CANS','extras','إضافة عدد 2 كانز','Add 2 Cans',''),
('CF-RICE-PLATE','extras','طبق أرز','Rice Plate',''),
('CF-CHEDDAR-TURKEY-BACON-FRIES','extras','بطاطس بالشيدر وقطع التركي أو البيكون المدخن','Cheddar Fries with Turkey or Smoked Bacon',''),
('CF-CHEDDAR-JALAPENO-FRIES','extras','بطاطس بصوص الشيدر والهالبينو','Cheddar Jalapeno Fries',''),
('CF-BUFFALO-SAUCE','sauces','صوص البافلو','Buffalo Sauce',''),
('CF-CHEDDAR-CHEESE-SAUCE','sauces','صوص الجبنة الشيدر','Cheddar Cheese Sauce',''),
('CF-RANCH-SAUCE','sauces','صوص الرانش','Ranch Sauce',''),
('CF-PEPSI-CAN','drinks','بيبسي كانز','Pepsi Can',''),
('CF-PEPSI-LITER','drinks','بيبسي لتر','Pepsi 1 Liter',''),
('CF-BIG-COLA','drinks','بيج كولا','Big Cola',''),
('CF-MINERAL-WATER','drinks','مياه معدنية صغيرة','Small Mineral Water',''),
('CF-SELECT-BREAST','selected-pieces','قطعة مختارة صدر','Selected Breast Piece',''),
('CF-SELECT-THIGH','selected-pieces','قطعة مختارة فخد','Selected Thigh Piece',''),
('CF-SELECT-LEG','selected-pieces','قطعة مختارة كلة','Selected Leg Piece',''),
('CF-SELECT-STRIPS','selected-pieces','قطعة مختارة استربس','Selected Strips Piece',''),
('CF-SELECT-DRUMSTICK','selected-pieces','قطعة مختارة دبوس','Selected Drumstick Piece',''),
('CF-SELECT-WING','selected-pieces','قطعة مختارة جناح','Selected Wing Piece',''),
('CF-WING-SWAP-BREAST','wing-swaps','تبديل جناح بصدر','Swap Wing for Breast',''),
('CF-WING-SWAP-THIGH','wing-swaps','تبديل جناح بفخد','Swap Wing for Thigh',''),
('CF-WING-SWAP-DRUMSTICK','wing-swaps','تبديل جناح بدبوس','Swap Wing for Drumstick',''),
('CF-WING-SWAP-THIGH-BREAST','wing-swaps','تبديل فخد بصدر','Swap Thigh for Breast',''),
('CF-COMBO','extras','كومبو','Combo','كومبو بسعر إضافي كما هو موضح بالمنيو.')
)
insert into public.products(sku,category_id,name_ar,name_en,description_ar,is_active,sort_order)
select s.sku,c.id,s.name_ar,s.name_en,nullif(s.description_ar,''),true,
       row_number() over(partition by s.category_slug order by s.sku)::integer
from seed s join public.categories c on c.slug=s.category_slug
on conflict (sku) do update set
 category_id=excluded.category_id,name_ar=excluded.name_ar,name_en=excluded.name_en,
 description_ar=excluded.description_ar,is_active=true,updated_at=now();

with seed(sku,product_sku,name_ar,name_en,base_price,sort_order) as (values
('CF-KIDS-1','CF-KIDS','عادي','Regular',99,1),
('CF-SNACK-BOX-1','CF-SNACK-BOX','عادي','Regular',135,1),
('CF-DINNER-BOX-1','CF-DINNER-BOX','عادي','Regular',200,1),
('CF-SUPER-DINNER-BOX-1','CF-SUPER-DINNER-BOX','عادي','Regular',240,1),
('CF-FAMILY-MEAL-1','CF-FAMILY-MEAL','عادي','Regular',399,1),
('CF-FAMILY-BOX-1','CF-FAMILY-BOX','عادي','Regular',599,1),
('CF-SUPER-FAMILY-BOX-1','CF-SUPER-FAMILY-BOX','عادي','Regular',750,1),
('CF-FAMILY-JUMBO-1','CF-FAMILY-JUMBO','عادي','Regular',860,1),
('CF-SUPER-FAMILY-JUMBO-1','CF-SUPER-FAMILY-JUMBO','عادي','Regular',999,1),
('CF-RICE-MEAL-1','CF-RICE-MEAL','عادي','Regular',230,1),
('CF-RIZO-1','CF-RIZO','عادي','Regular',85,1),
('CF-CHEDDAR-STRIPS-RICE-1','CF-CHEDDAR-STRIPS-RICE','عادي','Regular',85,1),
('CF-BUFFALO-STRIPS-RICE-1','CF-BUFFALO-STRIPS-RICE','عادي','Regular',85,1),
('CF-CHEESE-STRIPS-1','CF-CHEESE-STRIPS','عادي','Regular',80,1),
('CF-DRUMSTICK-MEAL-1-1','CF-DRUMSTICK-MEAL-1','عادي','Regular',160,1),
('CF-DRUMSTICK-MEAL-2-1','CF-DRUMSTICK-MEAL-2','عادي','Regular',230,1),
('CF-STRIPS-FAMILY-10-1','CF-STRIPS-FAMILY-10','عادي','Regular',430,1),
('CF-STRIPS-FAMILY-15-1','CF-STRIPS-FAMILY-15','عادي','Regular',599,1),
('CF-STRIPS-FAMILY-20-1','CF-STRIPS-FAMILY-20','عادي','Regular',850,1),
('CF-WRAP-CHICKEN-1','CF-WRAP-CHICKEN','قطعة','Single Piece',90,1),
('CF-WRAP-CHICKEN-2','CF-WRAP-CHICKEN','قطعتين','Two Pieces',165,2),
('CF-TOASTER-ROLL-1','CF-TOASTER-ROLL','قطعة','Single Piece',100,1),
('CF-TOASTER-ROLL-2','CF-TOASTER-ROLL','قطعتين','Two Pieces',175,2),
('CF-MOZZARELLA-TWISTER-1','CF-MOZZARELLA-TWISTER','قطعة','Single Piece',125,1),
('CF-MOZZARELLA-TWISTER-2','CF-MOZZARELLA-TWISTER','قطعتين','Two Pieces',195,2),
('CF-BIG-FILLER-1','CF-BIG-FILLER','قطعة','Single Piece',135,1),
('CF-BIG-FILLER-2','CF-BIG-FILLER','قطعتين','Two Pieces',200,2),
('CF-CHICKEN-CLASSIC-1','CF-CHICKEN-CLASSIC','قطعة','Single Piece',125,1),
('CF-CHICKEN-CLASSIC-2','CF-CHICKEN-CLASSIC','قطعتين','Two Pieces',195,2),
('CF-CHICKEN-TURKEY-1','CF-CHICKEN-TURKEY','قطعة','Single Piece',135,1),
('CF-CHICKEN-TURKEY-2','CF-CHICKEN-TURKEY','قطعتين','Two Pieces',210,2),
('CF-BACON-FACTORY-1','CF-BACON-FACTORY','قطعة','Single Piece',135,1),
('CF-BACON-FACTORY-2','CF-BACON-FACTORY','قطعتين','Two Pieces',210,2),
('CF-MOZZARELLA-FACTORY-1','CF-MOZZARELLA-FACTORY','قطعة','Single Piece',135,1),
('CF-MOZZARELLA-FACTORY-2','CF-MOZZARELLA-FACTORY','قطعتين','Two Pieces',210,2),
('CF-ONION-FACTORY-1','CF-ONION-FACTORY','قطعة','Single Piece',135,1),
('CF-ONION-FACTORY-2','CF-ONION-FACTORY','قطعتين','Two Pieces',210,2),
('CF-SUPER-FACTORY-1','CF-SUPER-FACTORY','قطعة','Single Piece',140,1),
('CF-SUPER-FACTORY-2','CF-SUPER-FACTORY','قطعتين','Two Pieces',220,2),
('CF-FACTOR-CHEESE-1','CF-FACTOR-CHEESE','قطعة','Single Piece',135,1),
('CF-FACTOR-CHEESE-2','CF-FACTOR-CHEESE','قطعتين','Two Pieces',210,2),
('CF-CHICKEN-BURGER-CLASSIC-1','CF-CHICKEN-BURGER-CLASSIC','سنجل','Single',110,1),
('CF-CHICKEN-BURGER-CLASSIC-2','CF-CHICKEN-BURGER-CLASSIC','دبل','Double',160,2),
('CF-CHICKEN-BURGER-BBQ-1','CF-CHICKEN-BURGER-BBQ','سنجل','Single',110,1),
('CF-CHICKEN-BURGER-BBQ-2','CF-CHICKEN-BURGER-BBQ','دبل','Double',160,2),
('CF-CHICKEN-BURGER-RANCH-1','CF-CHICKEN-BURGER-RANCH','سنجل','Single',110,1),
('CF-CHICKEN-BURGER-RANCH-2','CF-CHICKEN-BURGER-RANCH','دبل','Double',160,2),
('CF-CHICKEN-BURGER-BIG-CHEESY-1','CF-CHICKEN-BURGER-BIG-CHEESY','سنجل','Single',110,1),
('CF-CHICKEN-BURGER-BIG-CHEESY-2','CF-CHICKEN-BURGER-BIG-CHEESY','دبل','Double',160,2),
('CF-BEEF-BURGER-BIG-CHEESY-1','CF-BEEF-BURGER-BIG-CHEESY','سنجل','Single',125,1),
('CF-BEEF-BURGER-BIG-CHEESY-2','CF-BEEF-BURGER-BIG-CHEESY','دبل','Double',190,2),
('CF-BEEF-BURGER-RANCH-1','CF-BEEF-BURGER-RANCH','سنجل','Single',125,1),
('CF-BEEF-BURGER-RANCH-2','CF-BEEF-BURGER-RANCH','دبل','Double',190,2),
('CF-BEEF-BURGER-BBQ-1','CF-BEEF-BURGER-BBQ','سنجل','Single',125,1),
('CF-BEEF-BURGER-BBQ-2','CF-BEEF-BURGER-BBQ','دبل','Double',190,2),
('CF-BEEF-BURGER-CLASSIC-1','CF-BEEF-BURGER-CLASSIC','سنجل','Single',125,1),
('CF-BEEF-BURGER-CLASSIC-2','CF-BEEF-BURGER-CLASSIC','دبل','Double',190,2),
('CF-BEEF-BURGER-CHEDDAR-1','CF-BEEF-BURGER-CHEDDAR','سنجل','Single',125,1),
('CF-BEEF-BURGER-CHEDDAR-2','CF-BEEF-BURGER-CHEDDAR','دبل','Double',190,2),
('CF-FRIES-1','CF-FRIES','صغير','Small',40,1),
('CF-FRIES-2','CF-FRIES','كبير','Large',50,2),
('CF-GARLIC-SALAD-1','CF-GARLIC-SALAD','صغير','Small',25,1),
('CF-GARLIC-SALAD-2','CF-GARLIC-SALAD','كبير','Large',40,2),
('CF-COLESLAW-1','CF-COLESLAW','صغير','Small',25,1),
('CF-COLESLAW-2','CF-COLESLAW','كبير','Large',40,2),
('CF-ADD-2-CANS-1','CF-ADD-2-CANS','عادي','Regular',6,1),
('CF-RICE-PLATE-1','CF-RICE-PLATE','عادي','Regular',40,1),
('CF-CHEDDAR-TURKEY-BACON-FRIES-1','CF-CHEDDAR-TURKEY-BACON-FRIES','عادي','Regular',60,1),
('CF-CHEDDAR-JALAPENO-FRIES-1','CF-CHEDDAR-JALAPENO-FRIES','عادي','Regular',55,1),
('CF-BUFFALO-SAUCE-1','CF-BUFFALO-SAUCE','عادي','Regular',45,1),
('CF-CHEDDAR-CHEESE-SAUCE-1','CF-CHEDDAR-CHEESE-SAUCE','عادي','Regular',45,1),
('CF-RANCH-SAUCE-1','CF-RANCH-SAUCE','عادي','Regular',40,1),
('CF-PEPSI-CAN-1','CF-PEPSI-CAN','عادي','Regular',25,1),
('CF-PEPSI-LITER-1','CF-PEPSI-LITER','عادي','Regular',35,1),
('CF-BIG-COLA-1','CF-BIG-COLA','عادي','Regular',15,1),
('CF-MINERAL-WATER-1','CF-MINERAL-WATER','عادي','Regular',10,1),
('CF-SELECT-BREAST-1','CF-SELECT-BREAST','عادي','Regular',80,1),
('CF-SELECT-THIGH-1','CF-SELECT-THIGH','عادي','Regular',70,1),
('CF-SELECT-LEG-1','CF-SELECT-LEG','عادي','Regular',65,1),
('CF-SELECT-STRIPS-1','CF-SELECT-STRIPS','عادي','Regular',45,1),
('CF-SELECT-DRUMSTICK-1','CF-SELECT-DRUMSTICK','عادي','Regular',50,1),
('CF-SELECT-WING-1','CF-SELECT-WING','عادي','Regular',30,1),
('CF-WING-SWAP-BREAST-1','CF-WING-SWAP-BREAST','عادي','Regular',50,1),
('CF-WING-SWAP-THIGH-1','CF-WING-SWAP-THIGH','عادي','Regular',45,1),
('CF-WING-SWAP-DRUMSTICK-1','CF-WING-SWAP-DRUMSTICK','عادي','Regular',25,1),
('CF-WING-SWAP-THIGH-BREAST-1','CF-WING-SWAP-THIGH-BREAST','عادي','Regular',20,1),
('CF-COMBO-1','CF-COMBO','عادي','Regular',60,1)
)
insert into public.product_variants(sku,product_id,name_ar,name_en,base_price,is_active,sort_order)
select s.sku,p.id,s.name_ar,s.name_en,s.base_price,true,s.sort_order
from seed s join public.products p on p.sku=s.product_sku
on conflict (sku) do update set
 product_id=excluded.product_id,name_ar=excluded.name_ar,name_en=excluded.name_en,
 base_price=excluded.base_price,is_active=true,sort_order=excluded.sort_order;

commit;

-- Verification: expected categories and number of menu items/price options.
select c.name_ar as category, count(distinct p.id) as products,
       count(v.id) as price_options
from public.categories c
left join public.products p on p.category_id=c.id and p.is_active
left join public.product_variants v on v.product_id=p.id and v.is_active
where c.slug in ('individual-meals','family-meals','rice-meals','drumstick-meals','strips-family','sandwiches','chicken-burgers','beef-burgers','extras','sauces','drinks','selected-pieces','wing-swaps')
group by c.id,c.name_ar,c.sort_order
order by c.sort_order;
