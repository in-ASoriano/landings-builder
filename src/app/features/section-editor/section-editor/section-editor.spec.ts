import { TestBed } from '@angular/core/testing';
import { LandingApiService } from '../../../core/services/landing-api.service';
import { SectionEditorComponent } from './section-editor';

describe('SectionEditorComponent null normalization', () => {
  function createComponent(section: unknown): SectionEditorComponent {
    TestBed.configureTestingModule({
      providers: [{ provide: LandingApiService, useValue: {} }]
    });

    const component = TestBed.runInInjectionContext(() => new SectionEditorComponent());
    component.selectedSectionJson = JSON.stringify(section, null, 2);
    return component;
  }

  it('sets empty text roots to null', () => {
    const component = createComponent({
      type: 'banner',
      title: { default: 'Architecture' }
    });

    component.updateLocalizedField(
      {
        id: 'title',
        label: 'Titulo',
        path: ['title'],
        value: 'Architecture',
        kind: 'localized',
        category: 'text',
        locales: []
      } as any,
      {
        key: 'default',
        label: 'Texto por defecto',
        path: ['title', 'default'],
        value: 'Architecture',
        multiline: false
      },
      ''
    );

    expect(JSON.parse(component.selectedSectionJson).title).toBeNull();
  });

  it('sets media roots without real sources to null', () => {
    const component = createComponent({
      type: 'banner',
      image_responsive: {
        default: {
          image_sm: '/landing/image.jpg',
          image_md: null
        }
      }
    });

    component.updateVisualField(
      {
        id: 'image',
        label: 'Mobile',
        path: ['image_responsive', 'default', 'image_sm'],
        value: '/landing/image.jpg',
        kind: 'string',
        category: 'media'
      } as any,
      ''
    );

    expect(JSON.parse(component.selectedSectionJson).image_responsive).toBeNull();
  });

  it('sets empty ecom links to null', () => {
    const component = createComponent({
      type: 'banner',
      ecom_link: {
        type: { default: 'category' },
        identifier: { default: null },
        url: 'null',
        anchor: null,
        obfuscated: false,
        custom_class: null,
        config_extra: {}
      }
    });

    component.updateLocalizedField(
      {
        id: 'ecom_link.type',
        label: 'Type',
        path: ['ecom_link', 'type'],
        value: 'category',
        kind: 'localized',
        category: 'links',
        locales: []
      } as any,
      {
        key: 'default',
        label: 'Type por defecto',
        path: ['ecom_link', 'type', 'default'],
        value: 'category',
        multiline: false
      },
      ''
    );

    expect(JSON.parse(component.selectedSectionJson).ecom_link).toBeNull();
  });
});
