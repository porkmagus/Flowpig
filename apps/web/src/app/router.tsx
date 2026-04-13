import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './providers';
import RootRoute from '~/routes/__root';
import IndexRoute from '~/routes/index';
import LoginRoute from '~/routes/login';
import SignupRoute from '~/routes/signup';
import OnboardingRoute from '~/routes/onboarding';
import WorkspaceLayout from '~/routes/$workspace/layout';
import WorkspaceIndex from '~/routes/$workspace/index';
import IssuesList from '~/routes/$workspace/issues';
import IssueDetail from '~/routes/$workspace/issues.$issueId';
import NotesList from '~/routes/$workspace/notes';
import NoteDetail from '~/routes/$workspace/notes.$noteSlug';
import CyclesList from '~/routes/$workspace/cycles';
import CycleDetail from '~/routes/$workspace/cycles.$cycleId';
import TeamPage from '~/routes/$workspace/team';
import SettingsPage from '~/routes/$workspace/settings';
import TriagePage from '~/routes/$workspace/triage';
import RoadmapPage from '~/routes/$workspace/roadmap';
import DatabasesList from '~/routes/$workspace/databases';
import DatabaseDetail from '~/routes/$workspace/databases.$databaseId';
import ProjectsList from '~/routes/$workspace/projects';
import ProjectDetail from '~/routes/$workspace/projects.$projectId';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <RootRoute />,
        children: [
          { index: true, element: <IndexRoute /> },
          { path: 'login', element: <LoginRoute /> },
          { path: 'signup', element: <SignupRoute /> },
          { path: 'onboarding', element: <OnboardingRoute /> },
          {
            path: ':workspace',
            element: <WorkspaceLayout />,
            children: [
              { index: true, element: <WorkspaceIndex /> },
              { path: 'issues', element: <IssuesList /> },
              { path: 'issues/:issueId', element: <IssueDetail /> },
              { path: 'notes', element: <NotesList /> },
              { path: 'notes/:noteSlug', element: <NoteDetail /> },
              { path: 'cycles', element: <CyclesList /> },
              { path: 'cycles/:cycleId', element: <CycleDetail /> },
              { path: 'team', element: <TeamPage /> },
              { path: 'triage', element: <TriagePage /> },
              { path: 'roadmap', element: <RoadmapPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'databases', element: <DatabasesList /> },
              { path: 'databases/:databaseId', element: <DatabaseDetail /> },
              { path: 'projects', element: <ProjectsList /> },
              { path: 'projects/:projectId', element: <ProjectDetail /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
