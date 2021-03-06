import React from 'react';
import cookie from 'react-cookie';
import { Link } from 'react-router-dom';
import { compose, setDisplayName } from 'recompose';

import BaseOnboardingTip from '../components/helptips/baseonboardingtip';
import DeploymentCompleteTip from '../components/helptips/deploymentcompletetip';

import AppActions from '../actions/app-actions';
import AppStore from '../stores/app-store';
import OnboardingCompleteTip from '../components/helptips/onboardingcompletetip';

const demoArtifactLink = 'https://dgsbl4vditpls.cloudfront.net/mender-demo-artifact.mender';

const onboardingTipSanityCheck = step =>
  !AppStore.getOnboardingComplete() && AppStore.getShowOnboardingTips() && AppStore.showHelptips() && !getOnboardingStepCompleted(step);

const onboardingSteps = {
  'dashboard-onboarding-start': {
    condition: () => onboardingTipSanityCheck('dashboard-onboarding-start'),
    component: <div>Click here to get started!</div>,
    progress: 1
  },
  'devices-pending-onboarding': {
    condition: () => onboardingTipSanityCheck('devices-accepted-onboarding') && AppStore.getPendingDevices().length,
    component: <div>This should be your device, asking for permission to join the server. Inspect its identity details, then check it to accept it!</div>,
    progress: 1
  },
  'devices-pending-accepting-onboarding': {
    condition: () => onboardingTipSanityCheck('devices-accepted-onboarding') && AppStore.getPendingDevices().length,
    component: <div>If you recognize this device as your own, you can accept it</div>,
    progress: 2
  },
  'dashboard-onboarding-pendings': {
    condition: () =>
      onboardingTipSanityCheck('dashboard-onboarding-pendings') &&
      getOnboardingStepCompleted('devices-pending-onboarding') &&
      AppStore.getPendingDevices().length,
    component: <div>Next accept your device</div>,
    progress: 2
  },
  'devices-accepted-onboarding': {
    condition: () => onboardingTipSanityCheck('devices-accepted-onboarding') && AppStore.getAcceptedDevices().length > 0,
    component: (
      <div>
        <b>Good job! Your first device is connected!</b>
        <p>
          Your device is now <b>accepted</b>! It&apos;s now going to share inventory details with the server.
        </p>
        Click to expand the device and see more
      </div>
    ),
    progress: 1
  },
  'application-update-reminder-tip': {
    condition: () =>
      onboardingTipSanityCheck('artifact-included-deploy-onboarding') &&
      window.location.hash.endsWith('#/devices') &&
      AppStore.getAcceptedDevices().length > 0 &&
      (AppStore.getAcceptedDevices().every(item => !!item.attributes) || getOnboardingStepCompleted('devices-accepted-onboarding')),
    component: (
      <div>
        <b>Deploy your first Application update</b>
        <p>
          To continue to make a demo deployment to this device click the <Link to="/releases">Releases</Link> tab
        </p>
      </div>
    ),
    progress: 2
  },
  'upload-prepared-artifact-tip': {
    condition: () =>
      onboardingTipSanityCheck('artifact-included-onboarding') && getOnboardingStepCompleted('devices-accepted-onboarding') && !AppStore.getReleases().length,
    component: (
      <div>
        Download our prepared demo Artifact from <a href={demoArtifactLink}>here</a> to upload it to your profile.
      </div>
    ),
    progress: 2
  },
  'artifact-included-onboarding': {
    condition: () => onboardingTipSanityCheck('deployments-inprogress') && getOnboardingStepCompleted('devices-accepted-onboarding'),
    component: compose(setDisplayName('OnboardingTip'))(() => (
      <div>
        {AppStore.getOnboardingArtifactIncluded() ? 'We have included' : 'Now you have'} a Mender artifact with a simple Application update for you to test
        with.<p>Expand it for more details.</p>
      </div>
    )),
    progress: 1
  },
  'artifact-included-deploy-onboarding': {
    condition: () => onboardingTipSanityCheck('deployments-inprogress') && getOnboardingStepCompleted('artifact-included-onboarding'),
    component: <div>Let&apos;s deploy this Release to your device now</div>,
    progress: 1
  },
  'scheduling-artifact-selection': {
    condition: () => onboardingTipSanityCheck('scheduling-artifact-selection') && AppStore.getTotalAcceptedDevices() && AppStore.getDeploymentRelease(),
    component: compose(setDisplayName('OnboardingTip'))(() => <div>{`Select the ${AppStore.getDeploymentRelease().Name} release we included.`}</div>),
    progress: 2
  },
  'scheduling-all-devices-selection': {
    condition: () => onboardingTipSanityCheck('scheduling-all-devices-selection') && AppStore.getTotalAcceptedDevices() && !AppStore.getSelectedDevice(),
    component: (
      <div>
        Select &apos;All devices&apos; for now.<p>You can learn how to create device groups later.</p>
      </div>
    ),
    progress: 2
  },
  'scheduling-group-selection': {
    condition: () =>
      onboardingTipSanityCheck('scheduling-group-selection') &&
      AppStore.getTotalAcceptedDevices() &&
      !AppStore.getSelectedDevice() &&
      AppStore.getGroups().length > 1, // group 0 will be the ungrouped group and always present
    component: compose(setDisplayName('OnboardingTip'))(() => <div>{`Select the ${AppStore.getGroups()[1]} device group you just made.`}</div>),
    progress: 2
  },
  'scheduling-release-to-devices': {
    condition: () =>
      onboardingTipSanityCheck('scheduling-release-to-devices') &&
      AppStore.getTotalAcceptedDevices() &&
      (AppStore.getSelectedGroup() || AppStore.getSelectedDevice()) &&
      AppStore.getDeploymentRelease(),
    component: compose(setDisplayName('OnboardingTip'))(() => (
      <div>{`Create the deployment! This will deploy the ${AppStore.getDeploymentRelease().Name} Artifact to ${
        AppStore.getSelectedDevice() ? AppStore.getSelectedDevice().id : AppStore.getSelectedGroup() || 'All devices'
      }`}</div>
    ))
  },
  'deployments-inprogress': {
    condition: () => onboardingTipSanityCheck('upload-new-artifact-tip') && AppStore.getDeploymentsInProgress().length,
    component: <div>Your deployment is in progress. Click to view a report</div>,
    progress: 2
  },
  'deployments-past': {
    condition: () => onboardingTipSanityCheck('upload-new-artifact-tip') && AppStore.getPastDeployments().length && !window.location.hash.includes('finished'),
    component: <div>Your deployment has finished, click here to view it</div>,
    progress: 3
  },
  'deployments-past-completed': {
    condition: () => onboardingTipSanityCheck('deployments-past-completed') && AppStore.getPastDeployments().length,
    component: <DeploymentCompleteTip targetUrl="destination-unreachable" />
  },
  'deployments-past-completed-failure': {
    condition: () =>
      onboardingTipSanityCheck('deployments-past-completed-failure') &&
      !AppStore.getPastDeployments().reduce((accu, item) => {
        if (item.status === 'failed' || (item.stats && item.stats.noartifact + item.stats.failure + item.stats['already-installed'] + item.stats.aborted > 0)) {
          return false;
        }
        return accu;
      }, true),
    component: (
      <div>Your deployment has finished, but it looks like there was a problem. Click to view the deployment report, where you can see the error log.</div>
    )
  },
  'upload-new-artifact-tip': {
    condition: () => onboardingTipSanityCheck('upload-new-artifact-tip') && getOnboardingStepCompleted('deployments-past-completed'),
    component: (
      <div>
        Now upload your new Artifact here!
        <p>
          Or <a onClick={() => AppActions.setShowCreateArtifactDialog(true)}>view the instructions again</a> on how to edit the demo webserver application and
          create your own Artifact
        </p>
      </div>
    ),
    progress: 2
  },
  'artifact-modified-onboarding': {
    condition: () => onboardingTipSanityCheck('artifact-modified-onboarding') && getOnboardingStepCompleted('upload-new-artifact-tip'),
    component: (
      <div>
        Your uploaded Artifact is now part of a new &apos;Release&apos;.
        <p>Now create a deployment with this Release!</p>
      </div>
    ),
    progress: 1
  },
  'onboarding-finished': {
    condition: () =>
      onboardingTipSanityCheck('onboarding-finished') && getOnboardingStepCompleted('artifact-modified-onboarding') && AppStore.getPastDeployments().length > 1,
    specialComponent: <OnboardingCompleteTip targetUrl="destination-unreachable" />
  }
};

const getCurrentOnboardingState = () => ({
  complete: AppStore.getOnboardingComplete(),
  deviceType: AppStore.getOnboardingDeviceType(),
  showTips: AppStore.getShowOnboardingTips(),
  progress: AppStore.getOnboardingProgress(),
  approach: AppStore.getOnboardingApproach(),
  artifactIncluded: AppStore.getOnboardingArtifactIncluded()
});

export function getOnboardingComponentFor(id, params, previousComponent = null) {
  const step = onboardingSteps[id];
  if (!step.condition()) {
    return previousComponent;
  }
  if (step.specialComponent) {
    return React.cloneElement(step.specialComponent, params);
  }
  const component = typeof step.component === 'function' ? step.component() : step.component;
  return <BaseOnboardingTip id={id} component={component} progress={step.progress || params.progress || null} {...params} />;
}

export function getOnboardingStepCompleted(id) {
  const progress = AppStore.getOnboardingProgress();
  const stepIndex = Object.keys(onboardingSteps).findIndex(step => step === id);
  return progress > stepIndex;
}

const determineProgress = (acceptedDevices, pendingDevices, releases, pastDeployments) => {
  const steps = Object.keys(onboardingSteps);
  let progress = -1;
  progress = pendingDevices.length > 1 ? steps.findIndex(step => step === 'devices-pending-accepting-onboarding') : progress;
  progress = acceptedDevices.length > 1 && releases.length > 1 ? steps.findIndex(step => step === 'application-update-reminder-tip') : progress;
  progress =
    acceptedDevices.length > 1 && releases.length > 1 && pastDeployments.length > 1 ? steps.findIndex(step => step === 'deployments-past-completed') : progress;
  progress =
    acceptedDevices.length >= 1 && releases.length >= 2 && pastDeployments.length > 1
      ? steps.findIndex(step => step === 'artifact-modified-onboarding')
      : progress;
  progress =
    acceptedDevices.length >= 1 && releases.length >= 2 && pastDeployments.length > 2 ? steps.findIndex(step => step === 'onboarding-finished') : progress;
  return progress;
};

export function getOnboardingState(userId) {
  let promises = Promise.resolve(getCurrentOnboardingState());
  const onboardingKey = `${userId}-onboarding`;
  const savedState = JSON.parse(window.localStorage.getItem(onboardingKey)) || {};
  if (!Object.keys(savedState).length || !savedState.complete) {
    const userCookie = cookie.load(`${userId}-onboarded`);
    // to prevent tips from showing up for previously onboarded users completion is set explicitly before the additional requests complete
    if (userCookie) {
      AppActions.setOnboardingComplete(Boolean(userCookie));
    }
    const requests = [
      AppActions.getDevicesByStatus('accepted').then(AppActions.getDevicesWithInventory),
      AppActions.getReleases(),
      AppActions.getPastDeployments(),
      Promise.resolve(userCookie),
      AppActions.getDevicesByStatus('accepted')
    ];

    promises = Promise.all(requests).then(([acceptedDevices, releases, pastDeployments, onboardedCookie, pendingDevices]) => {
      const deviceType =
        acceptedDevices.length && acceptedDevices[0].hasOwnProperty('attributes')
          ? acceptedDevices[0].attributes.find(item => item.name === 'device_type').value
          : '';
      const state = {
        complete: !!(
          Boolean(onboardedCookie) ||
          savedState.complete ||
          (acceptedDevices.length > 1 && pendingDevices.length > 0 && releases.length > 1 && pastDeployments.length > 1) ||
          (acceptedDevices.length >= 1 && releases.length >= 2 && pastDeployments.length > 2) ||
          (acceptedDevices.length >= 1 && pendingDevices.length > 0 && releases.length >= 2 && pastDeployments.length >= 2) ||
          (mender_environment && mender_environment.disableOnboarding)
        ),
        showTips: savedState.showTips || onboardedCookie ? !onboardedCookie : true,
        deviceType:
          savedState.deviceType || AppStore.getOnboardingDeviceType() || (acceptedDevices.length && acceptedDevices[0].hasOwnProperty('attributes'))
            ? acceptedDevices[0].attributes.find(item => item.name === 'device_type').value
            : null,
        approach: savedState.approach || AppStore.getOnboardingApproach() || deviceType.startsWith('qemu') ? 'virtual' : 'physical',
        artifactIncluded: savedState.artifactIncluded || AppStore.getOnboardingArtifactIncluded(),
        progress: savedState.progress || determineProgress(acceptedDevices, pendingDevices, releases, pastDeployments)
      };
      window.localStorage.setItem(onboardingKey, JSON.stringify(state));
      return Promise.resolve(state);
    });
  } else {
    promises = Promise.resolve(savedState);
  }

  return promises
    .then(state => {
      AppActions.setOnboardingComplete(state.complete);
      AppActions.setOnboardingDeviceType(state.deviceType);
      AppActions.setOnboardingApproach(state.approach);
      AppActions.setOnboardingArtifactIncluded(state.artifactIncluded);
      AppActions.setShowOnboardingHelp(state.showTips);
      AppActions.setOnboardingProgress(state.progress);
      const progress = Object.keys(onboardingSteps).findIndex(step => step === 'deployments-past-completed');
      AppActions.setShowCreateArtifactDialog(Math.abs(state.progress - progress) <= 1);
      return Promise.resolve(state);
    })
    .catch(e => console.log(e));
}

export function advanceOnboarding(stepId) {
  const user = AppStore.getCurrentUser();
  const progress = AppStore.getOnboardingProgress();
  const stepIndex = Object.keys(onboardingSteps).findIndex(step => step === stepId);
  const madeProgress = progress <= stepIndex ? stepIndex + 1 : progress;
  const onboardingKey = `${user.id}-onboarding`;
  AppActions.setOnboardingProgress(madeProgress);
  const state = Object.assign(getCurrentOnboardingState(), { progress: madeProgress });
  state.complete = state.progress >= Object.keys(onboardingSteps).length ? true : state.complete;
  window.localStorage.setItem(onboardingKey, JSON.stringify(state));
}
