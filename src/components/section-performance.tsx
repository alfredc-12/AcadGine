"use client";

import { ChevronRight } from "lucide-react";
import { courseByCode, dimensions, facultyById, periods, type Dimension, type Period } from "@/data/academic";
import {
  averageSete, formatPercent, formatScore, gradeStatus, integer, percent, reviewTones, scopedRows, sectionKey, sectionTitle, signed,
  type SectionAssessment,
} from "@/lib/analytics";
import { RecordsTable, Status, type Column } from "@/components/records";
import { Table } from "@/components/ui/primitives";

const sectionColumns: Column<SectionAssessment>[] = [
  { id: "subject", title: "Subject",
    value: ({ row }) => `${courseByCode.get(row.course)?.name ?? row.course} (${row.course})`,
    display: ({ row }) => <span className="cell-title">{courseByCode.get(row.course)?.name ?? row.course}</span> },
  { id: "section", title: "Section", value: ({ row }) => row.section },
  { id: "sete", title: "SETE / 5", value: (item) => item.rating, numeric: true, display: (item) => formatScore(item.rating) },
  { id: "passed", title: "Passed", value: ({ row }) => row.graded ? row.passed : null, numeric: true },
  { id: "passing", title: "Passing (%)", value: (item) => item.passing, numeric: true, display: (item) => formatPercent(item.passing) },
  { id: "participation", title: "SETE response (%)", value: (item) => item.participation, numeric: true, display: (item) => formatPercent(item.participation) },
  { id: "status", title: "Status", value: (item) => item.status,
    display: (item) => <Status tone={reviewTones[item.status]}>{item.status}</Status> },
];

export function SectionPerformanceTable({ assessments, onOpen, exportName, statusFilter, comparison = false, dimension }: {
  assessments: SectionAssessment[];
  onOpen?: (assessment: SectionAssessment) => void;
  exportName?: string;
  statusFilter?: React.ReactNode;
  comparison?: boolean;
  dimension?: Dimension;
}) {
  const columns = [...sectionColumns];
  if (comparison) columns.push({
    id: "previous-rating", title: "Previous SETE / 5", value: (item) => item.previousRating, numeric: true,
    display: (item) => formatScore(item.previousRating),
  }, {
    id: "change", title: "SETE change (pts)", value: (item: SectionAssessment) => item.change, numeric: true,
    display: (item: SectionAssessment) => item.change === null ? "N/A" : signed(item.change, 2),
  });
  if (dimension) columns.splice(2, 0, {
    id: dimension, title: "Dimension / 5", value: ({ row }) => row.scores?.[dimension] ?? null, numeric: true,
    display: ({ row }) => formatScore(row.scores?.[dimension] ?? null),
  });
  return <RecordsTable label="Section performance" rows={assessments} columns={columns}
    keyOf={({ row }) => row.id} rowLabel={({ row }) => sectionTitle(row)}
    onOpen={onOpen} pageSize={6} exportName={exportName} tools={statusFilter} />;
}

export function SectionDetails({ assessment, period }: { assessment: SectionAssessment; period: Period }) {
  const { row, rating, passing, participation, previous, previousRating, change, reasons, status, action } = assessment;
  const history = periods.filter((item) => item.id < row.period).flatMap((item) => {
    const prior = scopedRows({ program: row.program, period: item.id }, row.course, sectionKey(row))[0];
    return prior ? [{ period: item, record: prior }] : [];
  });
  const comparablePeriod = previous ? periods.find((item) => item.id === previous.period)?.label : undefined;

  return <div className="section-detail">
    <dl className="detail-facts detail-identity">
      <div><dt>Subject</dt><dd>{row.course}</dd></div>
      <div><dt>Section</dt><dd>{row.section}</dd></div>
      <div><dt>Professor</dt><dd>{facultyById.get(row.faculty)?.name ?? row.faculty}</dd></div>
      <div><dt>Enrolled</dt><dd>{integer(row.enrolled)}</dd></div>
    </dl>

    <section aria-labelledby="drawer-academic">
      <h3 id="drawer-academic">Academic performance</h3>
      <dl className="detail-facts">
        <div><dt>Passing rate</dt><dd>{formatPercent(passing)}</dd></div>
        <div><dt>Finalized grades</dt><dd>{integer(row.graded)}</dd></div>
        <div><dt>Passed</dt><dd>{row.graded ? integer(row.passed) : "N/A"}</dd></div>
        <div><dt>Failed</dt><dd>{row.graded ? integer(row.graded - row.passed) : "N/A"}</dd></div>
      </dl>
      {history.length > 0 && <details className="disclosure">
        <summary>Section history <ChevronRight aria-hidden="true" /></summary>
        <div className="disclosure-body detail-history">
          <Table aria-label="Historical section outcomes">
            <thead><tr><th scope="col">Period</th><th scope="col" className="number">Passing</th><th scope="col" className="number">SETE / 5</th></tr></thead>
            <tbody>{history.map(({ period: item, record }) => <tr key={record.id}>
              <th scope="row">{item.short}</th>
              <td className="number">{formatPercent(percent(record.passed, record.graded))}</td>
              <td className="number">{formatScore(averageSete([record]))}</td>
            </tr>)}</tbody>
          </Table>
        </div>
      </details>}
    </section>

    <section aria-labelledby="drawer-evaluations">
      <h3 id="drawer-evaluations">SETE summary</h3>
      <dl className="detail-facts">
        <div><dt>Average rating</dt><dd>{rating === null ? "N/A" : `${formatScore(rating)} / 5`}</dd></div>
        <div><dt>Participation</dt><dd>{formatPercent(participation)}</dd></div>
        <div><dt>Valid responses</dt><dd>{integer(row.responses)}</dd></div>
        <div><dt>Eligible invitations</dt><dd>{integer(row.invitations)}</dd></div>
        <div><dt>Previous rating{comparablePeriod && ` · ${comparablePeriod}`}</dt><dd>{formatScore(previousRating)}</dd></div>
        <div><dt>Comparable change</dt><dd>{change === null ? "Unavailable" : `${signed(change, 2)} pts`}</dd></div>
      </dl>
      <dl className="detail-dimensions" aria-label="Illustrative evaluation dimensions">
        {dimensions.map(({ id, name }) => <div key={id}><dt>{name}</dt><dd>
          <span className="dimension-track" aria-hidden="true"><span style={{ width: `${(row.scores?.[id] ?? 0) / 5 * 100}%` }} /></span>
          <strong>{formatScore(row.scores?.[id] ?? null)}</strong>
        </dd></div>)}
      </dl>
    </section>

    <section aria-labelledby="drawer-status">
      <h3 id="drawer-status">Review status <Status tone={reviewTones[status]}>{status}</Status></h3>
      <p>{action}</p>
      <details className="disclosure">
        <summary>Supporting evidence <ChevronRight aria-hidden="true" /></summary>
        <div className="disclosure-body">
          {reasons.length ? <ul className="review-reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            : <p>Available grades and SETE responses meet the demo evidence requirements. No review rule was triggered.</p>}
        </div>
      </details>
    </section>

    <details className="disclosure">
      <summary>Simulated portal records <ChevronRight aria-hidden="true" /></summary>
      <div className="disclosure-body"><dl className="detail-facts">
        <div><dt>Approved seats</dt><dd>{row.seats}</dd></div><div><dt>Grade submission</dt><dd>{gradeStatus(row, period)}</dd></div>
        <div><dt>Grade deadline</dt><dd>{row.deadline}</dd></div><div><dt>Finalized</dt><dd>{row.finalized ?? "Pending"}</dd></div>
      </dl></div>
    </details>
  </div>;
}
