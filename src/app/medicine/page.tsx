'use client';

import Link from 'next/link';

export default function MedicinePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-primary-900 mb-1">
        💊 Pesach Medicine Guidelines
      </h2>
      <p className="text-primary-500 text-sm mb-6">
        From the OU Passover Guide 5786 — Non-Food Items section
      </p>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
        <p className="text-orange-800 font-semibold text-sm">
          ⚠️ Important: Exercise extreme caution and consult with your doctor and rabbi
          before making a decision not to take a medicine.
        </p>
      </div>

      <div className="space-y-6">
        {/* Guideline 1 */}
        <section className="bg-white rounded-xl border border-primary-100 p-5">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-2">
            Non-Chewable Pills, Creams & Injections
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              ✅ Generally Permitted
            </span>
          </div>
          <p className="text-sm text-primary-700 leading-relaxed">
            Known and tested medications in the form of creams, non-chewable pills, and
            injections may be owned, used, and consumed on Pesach — even if they contain
            chametz or kitniyot — since they are inedible. This covers most medicines used
            by adults.
          </p>
          <p className="text-sm text-primary-500 mt-2 italic">
            However, if an equally effective chametz-free alternative is available or
            procurable, this should be used instead.
          </p>
        </section>

        {/* Guideline 2 */}
        <section className="bg-white rounded-xl border border-primary-100 p-5">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-2">
            Liquid Medicines, Chewable Pills & Coated Pills
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              ⚠️ May Contain Chametz — Consult Rabbi
            </span>
          </div>
          <p className="text-sm text-primary-700 leading-relaxed">
            Liquid medicines, chewable pills, and pills coated with a flavored glaze are
            considered palatable and may contain chametz. Gelcaps may also present a problem
            because they may contain non-kosher edible gelatin.
          </p>

          <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary-200">
            <div>
              <p className="text-sm font-semibold text-primary-800">Option A: Substitute</p>
              <p className="text-sm text-primary-600">
                If possible, replace under the direction of a doctor with a non-chewable,
                uncoated pill.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-800">Option B: Danger (Sakana)</p>
              <p className="text-sm text-primary-600">
                If substitution is not possible and the person is in a state of sakana or safek
                sakana (any possible danger to human life), the medication may be owned and
                consumed. A rabbi should be consulted about purchase timing and disposal after
                the danger passes.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-800">Option C: No Danger</p>
              <p className="text-sm text-primary-600">
                If substitution is not possible and a doctor determines no possibility of sakana,
                consult a rabbi. He may determine the medicine does not contain chametz/kitniyot,
                or may permit it due to the seriousness of the condition.
              </p>
            </div>
          </div>
        </section>

        {/* Guideline 3 */}
        <section className="bg-white rounded-xl border border-primary-100 p-5">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-2">
            Children&apos;s Medicine
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              🔵 Conditional
            </span>
          </div>
          <p className="text-sm text-primary-700 leading-relaxed">
            It is permissible to grind pills and mix the powder into food items so that a child
            can take medicine on Pesach. However, a doctor must be consulted to make sure the child
            is getting the correct dosage and the potency is not compromised by altering its consistency.
          </p>
        </section>

        {/* Guideline 4 */}
        <section className="bg-white rounded-xl border border-primary-100 p-5">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-2">
            Kitniyot in Medicine
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
              🟡 Permitted for Ill Persons
            </span>
          </div>
          <p className="text-sm text-primary-700 leading-relaxed">
            Unless an equivalent alternative is available, medicinal items which contain kitniyot
            are permitted for people who are ill. Questions on this issue should be directed to your rabbi.
          </p>
        </section>

        {/* Note */}
        <section className="bg-primary-50 rounded-xl p-5">
          <p className="text-sm text-primary-600">
            <strong>Note:</strong> These guidelines do not address the more general prohibition
            of consuming medicines on Shabbat and Yom Tov.
          </p>
        </section>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/documents/ou-nonfood"
          className="text-sm text-gold-600 hover:underline"
        >
          📄 View full OU Non-Food Items document
        </Link>
      </div>
    </div>
  );
}
